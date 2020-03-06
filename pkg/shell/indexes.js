/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2016 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import $ from "jquery";
import cockpit from "cockpit";
import React from "react";
import ReactDOM from "react-dom";

import { cNav, cNavItem } from "./nav.jsx";

import * as base_index from "./base_index";

const _ = cockpit.gettext;

var shell_embedded = window.location.pathname.indexOf(".html") !== -1;

function MachinesIndex(index_options, machines, loader, mdialogs) {
    if (!index_options)
        index_options = {};

    var page_status = { };
    sessionStorage.removeItem("cockpit:page_status");

    index_options.navigate = function (state, sidebar) {
        return navigate(state, sidebar);
    };
    index_options.handle_notifications = function (host, page, data) {
        if (data.page_status !== undefined) {
            if (!page_status[host])
                page_status[host] = { };
            page_status[host][page] = data.page_status;
            sessionStorage.setItem("cockpit:page_status", JSON.stringify(page_status));
            // Just for triggering an "updated" event
            machines.overlay(host, { });
        }
    };

    var index = base_index.new_index_from_proto(index_options);

    /* Restarts */
    $(index).on("expect_restart", function (ev, host) {
        loader.expect_restart(host);
    });

    /* Disconnection Dialog */
    var watchdog_problem = null;
    $(index).on("disconnect", function (ev, problem) {
        watchdog_problem = problem;
        show_disconnected();
    });

    /* Is troubleshooting dialog open */
    var troubleshooting = false;
    var machines_timer = null;

    $("#machine-dropdown").on("hide.bs.dropdown", function () {
        $("#find-machine").val("");
        $("#machine-dropdown ul li").toggleClass("hidden", false);
    });

    $("#find-machine").on("keyup", function (ev) {
        if (machines_timer)
            window.clearTimeout(machines_timer);

        machines_timer = window.setTimeout(function () {
            filter_machines();
            machines_timer = null;
        }, 250);
    });

    $("#host-nav-item").on("click", function (ev) {
        if ($(this).hasClass("active")) {
            $(this).toggleClass("menu-visible");
            $("#host-nav").toggleClass("interact");
            ev.preventDefault();
            return false;
        } else {
            $(this).toggleClass("menu-visible", true);
            $("#host-nav").toggleClass("interact", true);
        }
    });

    /* Reconnect button */
    $("#machine-reconnect").on("click", function(ev) {
        if (watchdog_problem) {
            cockpit.sessionStorage.clear();
            window.location.reload(true);
        } else {
            navigate(null, true);
        }
    });

    /* Troubleshoot pause navigation */
    $("#troubleshoot-dialog").on("show.bs.modal", function(ev) {
        troubleshooting = true;
    });

    /* Troubleshoot dialog close */
    $("#troubleshoot-dialog").on("hide.bs.modal", function(ev) {
        troubleshooting = false;
        navigate(null, true);
    });

    /* Navigation */
    var ready = false;
    var filter_timer = null;
    function on_ready() {
        ready = true;
        index.ready();
    }

    function preload_frames () {
        for (const m of machines.list)
            index.preload_frames(m, m.manifests);
    }

    // Click on active menu item (when using arrows to navigate through menu)
    function clickActiveItem() {
        const cur = document.activeElement;
        if (cur.nodeName === "INPUT") {
            const el = document.querySelector("#host-apps li:first-of-type > a");
            if (el)
                el.click();
        } else {
            cur.click();
        }
    }

    // Move focus to next item in menu (when using arrows to navigate through menu)
    // With arguments it is possible to change direction
    function focusNextItem(begin, step) {
        const cur = document.activeElement;
        const all = Array.from(document.querySelectorAll("#host-apps li a"));
        if (cur.nodeName === "INPUT" && all) {
            if (begin < 0)
                begin = all.length - 1;
            all[begin].focus();
        } else {
            let i = all.findIndex(item => item === cur);
            i += step;
            if (i < 0 || i >= all.length)
                document.getElementById("filter-menus").focus();
            else
                all[i].focus();
        }
    }

    function navigate_apps(ev) {
        if (ev.keyCode === 13) // Enter
            clickActiveItem();
        else if (ev.keyCode === 40) // Arrow Down
            focusNextItem(0, 1);
        else if (ev.keyCode === 38) // Arrow Up
            focusNextItem(-1, -1);
        else if (ev.keyCode === 27) { // Escape - clean selection
            document.getElementById("filter-menus").value = "";
            update_navbar();
            document.getElementById("filter-menus").focus();
        } else {
            return false;
        }
        return true;
    }

    function on_filter_menus_changed(ev) {
        if (!navigate_apps(ev)) {
            if (filter_timer)
                window.clearTimeout(filter_timer);

            filter_timer = window.setTimeout(function () {
                if (document.getElementById("filter-menus") === document.activeElement)
                    update_navbar();
                filter_timer = null;
            }, 250);
        }
    }

    document.getElementById("host-apps").addEventListener("keyup", on_filter_menus_changed);
    document.getElementById("host-apps").addEventListener("change", on_filter_menus_changed);

    /* When the machine list is ready we start processing navigation */
    $(machines)
            .on("ready", on_ready)
            .on("added updated", function(ev, machine) {
                if (!machine.visible)
                    index.frames.remove(machine);
                else if (machine.problem)
                    index.frames.remove(machine);

                update_machines();
                preload_frames();
                if (ready)
                    navigate();
            })
            .on("removed", function(ev, machine) {
                index.frames.remove(machine);
                update_machines();
            });

    if (machines.ready)
        on_ready();

    /* When only one machine this operates as a link */
    $("#machine-link").on("click", function(ev) {
        if (machines.list.length == 1) {
            index.jump({ host: machines.list[0].address, sidebar: true, component: "" });
            ev.preventDefault();
            return false;
        }
    });

    function show_disconnected() {
        if (!ready) {
            const ca_cert_url = window.sessionStorage.getItem("CACertUrl");
            if (window.navigator.userAgent.indexOf("Safari") >= 0 && ca_cert_url) {
                $("#safari-cert-help a").attr("href", ca_cert_url);
                $("#safari-cert-help").prop("hidden", false);
            }
            $("#early-failure").prop("hidden", false);
            $("#main").hide();
            $("body").prop("hidden", false);
            return;
        }

        var current_frame = index.current_frame();

        if (current_frame)
            $(current_frame).hide();

        $(".curtains-ct .spinner").prop("hidden", true);
        $("#machine-reconnect").toggle(true);
        $("#machine-troubleshoot").toggle(false);
        $(".curtains-ct i").toggle(true);
        $(".curtains-ct h1").text(_("Disconnected"));
        $(".curtains-ct p").text(cockpit.message(watchdog_problem));
        $(".curtains-ct").prop("hidden", false);
        $("#navbar-dropdown").addClass("disabled");
    }

    /* Handles navigation */
    function navigate(state, reconnect) {
        var machine;
        $('#host-nav-item').toggleClass("menu-visible", false);
        $("#host-nav").toggleClass("interact", false);

        /* If this is a watchdog problem or we are troubleshooting
         * let the dialog handle it */
        if (watchdog_problem || troubleshooting)
            return;

        /* phantomjs has a problem retrieving state, so we allow it to be passed in */
        if (!state)
            state = index.retrieve_state();
        machine = machines.lookup(state.host);

        /* No such machine */
        if (!machine) {
            machine = {
                key: state.host,
                address: state.host,
                label: state.host,
                state: "failed",
                problem: "not-found",
            };

        /* Asked to reconnect to the machine */
        } else if (!machine.visible) {
            machine.state = "failed";
            machine.problem = "not-found";
        } else if (reconnect && machine.state !== "connected") {
            loader.connect(state.host);
        }

        var compiled = compile(machine);
        if (machine.manifests && !state.component)
            state.component = choose_component(state, compiled);

        update_navbar(machine, state, compiled);
        update_frame(machine, state, compiled);
        update_docs(machine, state, compiled);

        /* Just replace the state, and URL */
        index.jump(state, true);
    }

    function choose_component(state, compiled) {
        var item, menu_items;

        if (shell_embedded)
            state.sidebar = true;

        /* See if we can find something with currently selected label */
        var label = $("#sidebar li.active a").text();
        if (label) {
            item = compiled.search("label", label);
            if (item)
                return item.path;
        }

        /* Go for the first item */
        menu_items = compiled.ordered("menu");
        if (menu_items.length > 0 && menu_items[0])
            return menu_items[0].path;

        return "system";
    }

    function update_navbar(machine, state, compiled) {
        if (!state)
            state = index.retrieve_state();

        if (!machine)
            machine = machines.lookup(state.host);

        if (!compiled)
            compiled = compile(machine);

        const filter = document.getElementById("filter-menus");
        var term = "";
        if (filter)
            term = filter.value.toLowerCase();

        function keyword_relevance(current_best, item) {
            const translate = item.translate || false;
            const weight = item.weight || 0;
            let score;
            let _m = "";
            let best = { score: -1 };
            item.matches.forEach(m => {
                if (translate)
                    _m = _(m);
                score = -1;
                // Best score when starts in translate language
                if (translate && _m.indexOf(term) == 0)
                    score = 4 + weight;
                // Second best score when starts in English
                else if (m.indexOf(term) == 0)
                    score = 3 + weight;
                // Substring consider only when at least 3 letters were used
                else if (term.length >= 3) {
                    if (translate && _m.indexOf(term) >= 0)
                        score = 2 + weight;
                    else if (m.indexOf(term) >= 0)
                        score = 1 + weight;
                }
                if (score > best.score) {
                    best = { keyword: m, score: score };
                }
            });
            if (best.score > current_best.score) {
                current_best = { keyword: best.keyword, score: best.score, goto: item.goto || null };
            }
            return current_best;
        }

        function keyword_filter(item) {
            item.keyword = { score:-1 };
            if (!term)
                return true;
            const best_keyword = item.keywords.reduce(keyword_relevance, { score:-1 });
            if (best_keyword.score > -1) {
                item.keyword = best_keyword;
                return true;
            }
            return false;
        }

        function clearSearch() {
            document.getElementById("filter-menus").value = "";
            update_navbar(machine, state, compiled);
        }

        function nav_item(component) {
            const active = state.component === component.path;

            // Parse path
            let path = component.path;
            let hash = component.hash;
            if (component.keyword.goto) {
                if (component.keyword.goto[0] === "/")
                    path = component.keyword.goto.substr(1);
                else
                    hash = component.keyword.goto;
            }

            // Parse page status
            let status = null;
            if (page_status[machine.key])
                status = page_status[machine.key][component.path];

            return React.createElement(cNavItem, {
                name: component.label,
                active: active,
                status: status,
                keyword: component.keyword.keyword,
                term: term,
                to: index.href({ host: machine.address, component: path, hash: hash }),
            });
        }

        const groups = [];

        const apps = compiled.ordered("dashboard")
                .filter(keyword_filter)
                .sort((a, b) => b.keyword.score - a.keyword.score)
                .map(nav_item);
        if (apps.length > 0)
            groups.push({ name: _("Apps"), items: apps });

        const menu = compiled.ordered("menu")
                .filter(keyword_filter)
                .sort((a, b) => b.keyword.score - a.keyword.score)
                .map(nav_item);
        if (menu.length > 0)
            groups.push({ name: _("System"), items: menu });

        const tools = compiled.ordered("tools")
                .filter(keyword_filter)
                .sort((a, b) => { return b.keyword.score - a.keyword.score })
                .map(nav_item);

        if (tools.length > 0)
            groups.push({ name: _("Tools"), items: tools });

        ReactDOM.render(
            React.createElement(cNav, {
                empty_message: _("No results found"),
                clear_search_msg: _("Clear Search"),
                groups: groups,
                clear_search: term !== "" ? clearSearch : null,
            }),
            document.getElementById("host-apps"));

        $("#machine-avatar").attr("src", machine && machine.avatar ? encodeURI(machine.avatar)
            : "../shell/images/server-small.png");

        var color = machine ? machine.color : "";
        $("#host-nav-item span.pficon-container-node").css("color", color);

        if (machine) {
            $("#machine-link span").text(machine.label);
            $("#machine-link").attr("title", machine.label);
        } else {
            $("#machine-link span").text(_("Machines"));
            $("#machine-link").attr("title", "");
        }
    }

    function update_docs(machine, state, compiled) {
        const item = compiled.items[state.component];
        const docs_items = document.getElementById("navbar-docs-items");
        docs_items.innerHTML = "";

        function create_item(name, url) {
            const el_li = document.createElement("li");
            const el_a = document.createElement("a");
            const el_icon = document.createElement("i");
            el_icon.className = "fa fa-external-link fa-xs";
            el_a.setAttribute("translate", "yes");
            el_a.setAttribute("href", url);
            el_a.setAttribute("target", "blank");
            el_a.setAttribute("rel", "noopener noreferrer");

            el_a.appendChild(document.createTextNode(name));
            el_a.appendChild(el_icon);

            el_li.appendChild(el_a);
            docs_items.appendChild(el_li);
        }

        const os_release = JSON.parse(window.localStorage['os-release'] || "{}");
        if (os_release.DOCUMENTATION_URL)
            create_item(cockpit.format(_("$0 documentation"), os_release.NAME), os_release.DOCUMENTATION_URL);

        create_item(_("Web Console"), "https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/managing_systems_using_the_rhel_8_web_console/index");

        if (item && item.docs && item.docs.length > 0)
            item.docs.forEach(e => create_item(_(e.label), e.url));
    }

    function update_title(label, machine) {
        var compiled;
        if (label)
            label += " - ";
        else
            label = "";
        var suffix = index.default_title;

        if (machine) {
            if (machine.address === "localhost") {
                compiled = compile(machine);
                if (compiled.ordered("menu").length || compiled.ordered("tools").length)
                    suffix = machine.label;
            } else {
                suffix = machine.label;
            }
        }
        document.title = label + suffix;
    }

    function update_frame(machine, state, compiled) {
        var title, message, connecting, restarting;
        var current_frame = index.current_frame();

        if (machine.state != "connected") {
            $(current_frame).hide();
            current_frame = null;
            index.current_frame(current_frame);

            connecting = (machine.state == "connecting");
            if (machine.restarting) {
                title = _("The machine is restarting");
                message = "";
            } else if (connecting) {
                title = _("Connecting to the machine");
                message = "";
            } else {
                title = _("Couldn't connect to the machine");
                if (machine.problem == "not-found") {
                    message = _("Cannot connect to an unknown machine");
                } else {
                    var error = machine.problem || machine.state;
                    if (error)
                        message = cockpit.message(error);
                    else
                        message = "";
                }
            }

            if (!machine.restarting && mdialogs.needs_troubleshoot(machine)) {
                $("#machine-troubleshoot").off()
                        .on("click", function () {
                            mdialogs.troubleshoot("troubleshoot-dialog", machine);
                        });
                $("#machine-troubleshoot").show();
            } else {
                $("#machine-troubleshoot").hide();
            }

            restarting = !!machine.restarting;
            $(".curtains-ct").prop("hidden", false);
            $(".curtains-ct .spinner").prop("hidden", !connecting && !restarting);
            $("#machine-reconnect").toggle(!connecting && machine.problem != "not-found");
            $(".curtains-ct i").toggle(!connecting && !restarting);
            $(".curtains-ct h1").text(title);
            $(".curtains-ct p").text(message);

            $("#machine-spinner").hide();

            update_title(null, machine);

            /* Fall through when connecting, and allow frame to load at same time */
            if (!connecting)
                return;
        }

        var hash = state.hash;
        var component = state.component;

        /* Old cockpit packages, used to be in shell/shell.html */
        var compat;
        if (machine && compiled.compat) {
            compat = compiled.compat[component];
            if (compat) {
                component = "shell/shell";
                hash = compat;
            }
        }

        var frame;
        if (component)
            frame = index.frames.lookup(machine, component, hash);
        if (frame != current_frame) {
            $(current_frame).css('display', 'none');
            index.current_frame(frame);
        }

        var label, item;
        if (machine.state == "connected") {
            $(".curtains-ct").prop("hidden", true);
            $("#machine-spinner").toggle(frame && !$(frame).attr("data-ready"));
            $(frame).css('display', 'block');
            item = compiled.items[state.component];
            label = item ? item.label : "";
            update_title(label, machine);
        }
    }

    function update_machines() {
        $("#machine-dropdown .fa-caret-down")
                .toggle(machines.list.length > 1);

        var machine_link = $("#machine-link");
        if (machines.list.length > 1)
            machine_link.attr("data-toggle", "dropdown");
        else
            machine_link.removeAttr("data-toggle");

        var list = $("#machine-dropdown ul");
        var links = machines.list.map(function(machine) {
            var text = $("<span>")
                    .text(machine.label)
                    .prepend($("<i>")
                            .attr("class", "fa-li fa fa-circle")
                            .css("color", machine.color || ""));
            return $("<li role='presentation'>")
                    .attr("data-address", machine.address)
                    .append($("<a>")
                            .attr("role", "menuitem")
                            .attr("tabindex", "-1")
                            .attr("data-address", machine.address)
                            .attr("href", index.href({ host: machine.address }, true))
                            .append(text));
        });
        list.empty().append(links);
    }

    function filter_machines () {
        var val = $("#find-machine").val()
                .toLowerCase();
        $("#machine-dropdown ul li").each(function() {
            var el = $(this);
            var a = el.find('a').first();
            var txt = a.text().toLowerCase();
            var addr = a.attr("data-address") ? a.attr("data-address").toLowerCase() : "";
            var hide = !!val && txt.indexOf(val) !== 0 && addr.indexOf(val) !== 0;
            el.toggleClass("hidden", hide);
        });
    }

    function compatibility(machine) {
        if (!machine.manifests || machine.address === "localhost")
            return null;

        var shell = machine.manifests.shell || { };
        var menu = shell.menu || { };
        var tools = shell.tools || { };

        var mapping = { };

        /* The following were included in shell/shell.html in old versions */
        if ("_host_" in menu)
            mapping["system/host"] = "/server";
        if ("_init_" in menu)
            mapping["system/init"] = "/services";
        if ("_network_" in menu)
            mapping["network/interfaces"] = "/networking";
        if ("_storage_" in menu)
            mapping["storage/devices"] = "/storage";
        if ("_users_" in tools)
            mapping["users/local"] = "/accounts";

        /* For Docker we have to guess ... some heuristics */
        if ("_storage_" in menu || "_init_" in menu)
            mapping["docker/containers"] = "/containers";

        return mapping;
    }

    function compile(machine) {
        var compiled = base_index.new_compiled();
        compiled.load(machine.manifests, "tools");
        compiled.load(machine.manifests, "dashboard");
        compiled.load(machine.manifests, "menu");
        compiled.compat = compatibility(machine);
        return compiled;
    }

    cockpit.transport.wait(function() {
        index.start();
    });
}

function SimpleIndex(index_options) {
    if (!index_options)
        index_options = {};

    index_options.navigate = function (state, sidebar) {
        return navigate(state, sidebar);
    };
    var default_title = index_options.default_title || "Cockpit";
    var index = base_index.new_index_from_proto(index_options);
    var compiled = base_index.new_compiled();

    compiled.load(cockpit.manifests, "dashboard");

    /* Disconnection Dialog */
    var watchdog_problem = null;
    $(index).on("disconnect", function (ev, problem) {
        watchdog_problem = problem;
        show_disconnected();
    });

    /* Reconnect button */
    $("#machine-reconnect").on("click", function(ev) {
        cockpit.sessionStorage.clear();
        window.location.reload(true);
    });

    function show_disconnected() {
        var current_frame = index.current_frame();
        if (current_frame)
            $(current_frame).hide();

        $(".curtains-ct .spinner").prop("hidden", true);
        $("#machine-reconnect").toggle(true);
        $(".curtains-ct i").toggle(true);
        $(".curtains-ct h1").text(_("Disconnected"));
        $(".curtains-ct p").text(cockpit.message(watchdog_problem));
        $(".curtains-ct").prop("hidden", false);
        $("#navbar-dropdown").addClass("disabled");
    }

    index.ready();

    /* Handles navigation */
    function navigate(state, reconnect) {
        var dashboards = compiled.ordered("dashboard");

        /* If this is a watchdog problem or we are troubleshooting
         * let the dialog handle it */
        if (watchdog_problem)
            return;

        /* phantomjs has a problem retrieving state, so we allow it to be passed in */
        if (!state)
            state = index.retrieve_state();

        if (!state.component && dashboards.length > 0) {
            state.component = dashboards[0].path;
        }
        update_navbar(state);
        update_frame(state);

        /* Just replace the state, and URL */
        index.jump(state, true);
    }

    function update_navbar(state) {
        $("#host-nav-item").toggleClass("dashboard-link", false);
        $(".dashboard-link").each(function() {
            var el = $(this);
            el.toggleClass("active", el.attr("data-component") === state.component);
        });

        var item = compiled.items[state.component];
        if (item && item.section == "dashboard")
            delete state.sidebar;

        $('.area-ct-body').toggleClass("single-nav", $(".dashboard-link").length < 2);
    }

    function update_title(label) {
        if (label)
            label += " - ";
        else
            label = "";
        document.title = label + default_title;
    }

    function update_frame(state) {
        var current_frame = index.current_frame();

        var hash = state.hash;
        var component = state.component;

        var frame;
        if (component)
            frame = index.frames.lookup(null, component, hash);
        if (frame != current_frame) {
            $(current_frame).css('display', 'none');
            index.current_frame(frame);
        }

        var label, item;
        $(frame).css('display', 'block');
        item = compiled.items[state.component];
        label = item ? item.label : "";
        update_title(label);
    }

    cockpit.transport.wait(function() {
        index.start();
    });
}

function message_queue(event) {
    window.messages.push(event);
}

/* When we're being loaded into the index window we have additional duties */
if (document.documentElement.getAttribute("class") === "index-page") {
    /* Indicates to child frames that we are a cockpit1 router frame */
    window.name = "cockpit1";

    /* The same thing as above, but compatibility with old cockpit */
    window.options = { sink: true, protocol: "cockpit1" };

    /* While the index is initializing, snag any messages we receive from frames */
    window.messages = [];

    window.messages.cancel = function() {
        window.removeEventListener("message", message_queue, false);
        window.messages = null;
    };

    window.addEventListener("message", message_queue, false);
}

export function simple_index(options) {
    return new SimpleIndex(options);
}

export function machines_index(options, machines_ins, loader, mdialogs) {
    return new MachinesIndex(options, machines_ins, loader, mdialogs);
}
