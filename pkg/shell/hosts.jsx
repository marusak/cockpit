import cockpit from "cockpit";

import React from 'react';
import PropTypes from 'prop-types';
import { PageSidebar } from '@patternfly/react-core';

import { CockpitNav, CockpitNavItem } from "./nav.jsx";

const _ = cockpit.gettext;

export class cHosts extends React.Component {
    constructor(props) {
        super(props);
        this.toggleMenu = this.toggleMenu.bind(this);
        this.state = {
            opened: false,
        };
    }

    toggleMenu() {
        this.setState(s => { return { opened: !s.opened } });
    }

    render() {
        const groups = [{
            name: _("Hosts"),
            items: this.props.machines.map(m => <CockpitNavItem key={m.label} name={m.label + "@" + m.user} />)
        }];
        return (
            <div className="view-hosts">
                <div className="ct-switcher">
                    <ul className="pf-c-select pf-m-dark">
                        <button className="pf-c-select__toggle pf-m-plain" id="host-switcher" onClick={this.toggleMenu} aria-labelledby="select-plain-label select-plain-toggle">
                            <div className="pf-c-select__toggle-wrapper">
                                <span className="pf-c-select__toggle-text">
                                    <span className="username">mmarusak</span>
                                    <span className="at">@</span>
                                    <span className="hostname">{this.props.machine.label}</span>
                                </span>
                            </div>
                            <i className={"fa pf-c-select__toggle-arrow fa-caret-" + (this.state.opened ? "up" : "down")} aria-hidden="true" />
                        </button>
                    </ul>
                </div>
                {this.state.opened &&
                    <PageSidebar isNavOpen={this.props.opened} theme="dark" className="sidebar-hosts" nav={
                        <>
                            <CockpitNav empty_message={_("No results found")} clear_search_msg={_("Clear Search")} groups={groups} />
                            <button id="edit-hosts" className="pf-c-button pf-m-secondary" type="button">
                                <span className="not-editing">Edit hosts</span>
                            </button>
                            <button id="add-host" className="pf-c-button pf-m-secondary" type="button">Add new host</button>
                        </>
                    } />
                }
            </div>
        );
    }
}

cHosts.propTypes = {
    machine: PropTypes.object,
    machines: PropTypes.array,
};
