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

import React from "react";
import "popup.css";

export class ContextMenu extends React.Component {
    constructor() {
        super();
        this.state = { visible: false };
        this._handleContextMenu = this._handleContextMenu.bind(this);
        this._handleClick = this._handleClick.bind(this);
    }

    componentDidMount() {
        document.addEventListener('contextmenu', this._handleContextMenu);
        document.addEventListener('click', this._handleClick);
    }

    componentWillUnmount() {
        document.removeEventListener('contextmenu', this._handleContextMenu);
        document.removeEventListener('click', this._handleClick);
    }

    _handleContextMenu(event) {
        event.preventDefault();

        this.setState({ visible: true });

        const clickX = event.clientX;
        const clickY = event.clientY;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const rootW = this.root.offsetWidth;
        const rootH = this.root.offsetHeight;

        const right = (screenW - clickX) > rootW;
        const left = !right;
        const top = (screenH - clickY) > rootH;
        const bottom = !top;

        if (right) {
            this.root.style.left = `${clickX + 5}px`;
        }

        if (left) {
            this.root.style.left = `${clickX - rootW - 5}px`;
        }

        if (top) {
            this.root.style.top = `${clickY + 5}px`;
        }

        if (bottom) {
            this.root.style.top = `${clickY - rootH - 5}px`;
        }
    }

    _handleClick(event) {
        if (event.button !== 0)
            return;
        const { visible } = this.state;
        const wasOutside = !(event.target.contains === this.root);

        if (wasOutside && visible) this.setState({ visible: false, });
    }

    render() {
        const { visible } = this.state;

        return (visible || null) &&
            <div ref={ ref => { this.root = ref } } className="contextMenu">
                <div className="contextMenuOption" onClick={this.props.getText} >Copy</div>
                <div className="contextMenuOption" onClick={this.props.setText} >Paste</div>
            </div>;
    }
}
