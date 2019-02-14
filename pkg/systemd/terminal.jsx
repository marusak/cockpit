import cockpit from "cockpit";

import React from "react";
import ReactDOM from "react-dom";

import { Terminal } from "cockpit-components-terminal.jsx";
import { Select, SelectEntry } from "cockpit-components-select.jsx";

const _ = cockpit.gettext;

(function() {
    cockpit.translate();

    /*
     * A terminal component for the cockpit user.
     *
     * Uses the Terminal component from base1 internally, but adds a header
     * with title and Reset button.
     *
     * Spawns the user's shell in the user's home directory.
     */
    class UserTerminal extends React.Component {
        createChannel(user) {
            return cockpit.channel({
                "payload": "stream",
                "spawn": [user.shell || "/bin/bash", "-i"],
                "environ": [
                    "TERM=xterm-256color",
                    "PATH=/sbin:/bin:/usr/sbin:/usr/bin"
                ],
                "directory": user.home || "/",
                "pty": true
            });
        }

        constructor(props) {
            super(props);
            var theme = document.cookie.replace(/(?:(?:^|.*;\s*)CockpitTerminalTheme\s*=\s*([^;]*).*$)|^.*$/, "$1");
            if (!theme)
                theme = "dark-theme";
            this.state = {
                title: 'Terminal',
                theme: theme
            };
            this.onTitleChanged = this.onTitleChanged.bind(this);
            this.onResetClick = this.onResetClick.bind(this);
            this.onThemeChanged = this.onThemeChanged.bind(this);
        }

        componentWillMount() {
            cockpit.user().done(function (user) {
                this.setState({ user: user, channel: this.createChannel(user) });
            }.bind(this));
        }

        onTitleChanged(title) {
            this.setState({ title: title });
        }

        onThemeChanged(value) {
            this.setState({ theme: value });
            var cookie = "CockpitTerminalTheme=" + encodeURIComponent(value) +
                         "; path=/; expires=Sun, 16 Jul 3567 06:23:41 GMT";
            document.cookie = cookie;
        }

        onResetClick(event) {
            if (event.button !== 0)
                return;

            if (this.state.channel)
                this.state.channel.close();

            if (this.state.user)
                this.setState({ channel: this.createChannel(this.state.user) });

            // don't focus the button, but keep it on the terminal
            this.refs.resetButton.blur();
            this.refs.terminal.focus();
        }

        render() {
            var terminal;
            if (this.state.channel)
                terminal = (<Terminal ref="terminal"
                     channel={this.state.channel}
                     theme={this.state.theme}
                     onTitleChanged={this.onTitleChanged} />);
            else
                terminal = <span>Loading...</span>;

            return (
                <div className="console-ct-container">
                    <div className="panel-heading terminal-group">
                        <tt className="terminal-title">{this.state.title}</tt>
                        <div>
                            <Select onChange={ this.onThemeChanged }
                                    id="theme-select"
                                    initial={ this.state.theme }>
                                <SelectEntry data='dark-theme'>{ _("Dark") }</SelectEntry>
                                <SelectEntry data='light-theme'>{ _("Light") }</SelectEntry>
                            </Select>
                            <button ref="resetButton"
                                 className="btn btn-default"
                                 onClick={ this.onResetClick }>{ _("Reset") }</button>
                        </div>
                    </div>
                    <div className={ "panel-body " + this.state.theme }>
                        {terminal}
                    </div>
                </div>
            );
        }
    }
    UserTerminal.displayName = "UserTerminal";

    ReactDOM.render(<UserTerminal />, document.getElementById('terminal'));

    /* And show the body */
    document.body.removeAttribute("hidden");
}());
