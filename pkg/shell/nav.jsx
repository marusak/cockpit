import cockpit from "cockpit";

import React from 'react';
import PropTypes from 'prop-types';

import {
    Nav,
    NavItem,
    NavGroup,
    Tooltip,
    TooltipPosition
} from '@patternfly/react-core';
import { ExclamationCircleIcon, ExclamationTriangleIcon, InfoCircleIcon } from '@patternfly/react-icons';

const _ = cockpit.gettext;

export class cNav extends React.Component {
    render() {
        return (
            <>
                <div className="has-feedback search" id="menu-search">
                    <input id="filter-menus" className="form-control" type="search" placeholder={_("Search")} aria-label={_("Search")} />
                    <span className="fa fa-search form-control-feedback" />
                </div>
                <Nav onSelect={this.onSelect} theme="dark">
                    { this.props.groups.map(g =>
                        <NavGroup key={g.name} title={g.name}>
                            {g.items}
                        </NavGroup>
                    )}
                    { this.props.groups.length < 1 && <span className="non-menu-item">{this.props.empty_message}</span> }
                    { this.props.clear_search && <span className="non-menu-item"><button onClick={this.props.clear_search} className="link-button hint">{this.props.clear_search_msg}</button></span> }
                </Nav>
            </>
        );
    }
}

cNav.propTypes = {
    groups: PropTypes.array,
    empty_message: PropTypes.string,
    clear_search_msg: PropTypes.string,
    clear_search: PropTypes.func,
};

function PageStatus(props) {
    const s = props.status;
    return (
        <Tooltip position={TooltipPosition.right} content={s.title}>
            {s.type == "error" ? <ExclamationCircleIcon color="#73bcf7" />
                : s.type == "warning" ? <ExclamationTriangleIcon color="#f0ab00" />
                    : <InfoCircleIcon color="#f54f42" />}
        </Tooltip>
    );
}

function FormatedText(props) {
    function split_text(text, term) {
        const b = text.toLowerCase().indexOf(term);
        const e = b + term.length;
        return [text.substring(0, b), text.substring(b, e), text.substring(e, text.length)];
    }

    const s = split_text(props.keyword, props.term);
    return (
        <>{s[0]}<mark>{s[1]}</mark>{s[2]}</>
    );
}

export class cNavItem extends React.Component {
    render() {
        const s = this.props.status;
        const name_matches = this.props.keyword === this.props.name.toLowerCase();
        return (
            <NavItem key={this.props.name} preventDefault to={this.props.to} isActive={this.props.active} className="nav-item">
                { name_matches ? <FormatedText keyword={this.props.name} term={this.props.term} /> : this.props.name }
                { s && s.type && <PageStatus status={s} />}
                { !name_matches && this.props.keyword && <span className="hint">{_("Contains:")} <FormatedText keyword={this.props.keyword} term={this.props.term} /></span>}
            </NavItem>
        );
    }
}

cNavItem.propTypes = {
    name: PropTypes.string,
    to: PropTypes.string,
    status: PropTypes.object,
    active: PropTypes.bool,
    keyword: PropTypes.string,
    term: PropTypes.string,
};
