/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2018 Red Hat, Inc.
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


(function() {
    "use strict";

    var React = require("react");

    var cockpitListing = require("cockpit-components-listing.jsx");

    var renderRow = function (values) {
        return <cockpitListing.ListingRow columns={values}/>;
    };

    var listHistory = function(rootElement, data) {
        var rows = data.map(renderRow);
        var listing = (
            <cockpitListing.Listing columnTitles={['Port', 'Host', 'From', 'To']}
                                    emptyCaption="No history available">
                {rows}
             </cockpitListing.Listing>
        );
        React.render(listing, rootElement);
    };

    module.exports = {
        listHistory: listHistory,
    };
}());
