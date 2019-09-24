/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2019 Red Hat, Inc.
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

/* NOTIFICATIONS

A page can broadcast notifications to the rest of Cockpit.  For
example, the "Software Updates" page can send out a notification when
it detects that software updates are available.  The shell will then
highlight the menu entry for "Software Updates" and the "System"
overview page will also mention it in its "Operating System" section.

The details are all still experimental and subject to change.

There is general Notification interface, which can be used to derive use-case
specific notifications.

*/

import cockpit from "cockpit";
import deep_equal from "deep-equal";

class Notification {
    constructor(type) {
        cockpit.event_target(this);
        window.addEventListener("storage", event => {
            if (event.key == "cockpit:" + type) {
                this.dispatchEvent("changed");
            }
        });

        this.type = type;
        this.cur_own = null;

        this.valid = false;
        cockpit.transport.wait(() => {
            this.valid = true;
            this.dispatchEvent("changed");
        });
    }

    get(page, host) {
        let res;

        if (!this.valid)
            return undefined;

        if (host === undefined)
            host = cockpit.transport.host;

        try {
            res = JSON.parse(sessionStorage.getItem("cockpit:" + this.type));
        } catch {
            return null;
        }

        if (res && res[host])
            return res[host][page] || null;
        return null;
    }

    set_own(status) {
        if (!deep_equal(status, this.cur_own)) {
            this.cur_own = status;
            cockpit.transport.control("notify", { [this.type]: status });
        }
    }
}

/* PAGE STATUS

A specific implementation is a simple "page status" notification, which is
either null, or a JSON value with the following fields:

 - type (string, optional)

 If specified, one of "info", "warning", "error".  The shell will put
 an appropriate icon next to the navigation entry for this page, for
 example.

 Omitting 'type' means that the page has no special status and is the
 same as using "null" as the whole status value.  This can be used to
 broadcast values in the 'details' field to other pages without
 forcing an icon into the navigation menu.

 - title (string, optional)

 A short, human readable, localized description of the status,
 suitable for a tooltip.

 - details (JSON value, optional)

 An arbitrary value.  The "System" overview page might monitor a
 couple of pages for their status and it will use 'details' to display
 a richer version of the status than possible with just type and
 title.

Usage:

 import { page_status } from "notifications";

 - page_status.set_own(STATUS)

 Sets the status of the page making the call, completely overwriting
 the current status.  For example,

    page_status.set_own({
      type: "info",
      title: _("Software updates available"),
      details: {
        num_updates: 10,
        num_security_updates: 5
      }
    });

    page_status.set_own({
      type: null
      title: _("System is up to date"),
      details: {
        last_check: 81236457
      }
    });

 Calling this function with the same STATUS value multiple times is
 cheap: only the first call will actually broadcast the new status.

 - page_status.get(PAGE, [HOST])

 Retrieves the current status of page PAGE of HOST.  When HOST is
 omitted, it defaults to the default host of the calling page.

 PAGE is the same string that Cockpit uses in its URLs to identify a
 page, such as "system/terminal" or "storage".

 Until the page_status object is fully initialized (see 'valid'
 below), this function will return 'undefined'.

 - page_status.addEventListener("changed", event => { ... })

 The "changed" event is emitted whenever any page status changes.

 - page_status.valid

 The page_status objects needs to initialize itself asynchronously and
 'valid' is false until this is done.  When 'valid' changes to true, a
 "changed" event is emitted.

*/

class PageStatus extends Notification {
    constructor() {
        super("page_status");
    }
}

class PageContains extends Notification {
    constructor() {
        super("page_contains");
    }
}

export const page_status = new PageStatus();
export const page_contains = new PageContains();
