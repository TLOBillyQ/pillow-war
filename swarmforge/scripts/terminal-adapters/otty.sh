#!/usr/bin/env zsh

# Otty terminal backend adapter for SwarmForge.
# Requires the Otty CLI (`otty`) on PATH, or `OTTY_CLI` set to the binary path.

_otty_cli="${OTTY_CLI:-$(command -v otty 2>/dev/null)}"
[[ -z "$_otty_cli" && -x "/Applications/Otty.app/Contents/MacOS/otty" ]] && _otty_cli="/Applications/Otty.app/Contents/MacOS/otty"
[[ -z "$_otty_cli" && -x "/Applications/Otty.app/Contents/MacOS/otty-cli" ]] && _otty_cli="/Applications/Otty.app/Contents/MacOS/otty-cli"

terminal_backend_label() {
  echo "Otty"
}

terminal_backend_can_open_sessions() {
  [[ -n "$_otty_cli" ]] && return 0
  return 1
}

terminal_backend_tracks_windows() {
  return 0
}

# Print the ID of the Otty window whose title matches $1.
# Prefers a focused window when several titles match.
_otty_window_id_by_title() {
  local wanted_title="$1"

  "$_otty_cli" window list --json 2>/dev/null | awk -v wanted="$wanted_title" '
    function json_string_value(line) {
      sub(/^[^:]*:[[:space:]]*"/, "", line)
      sub(/",?[[:space:]]*$/, "", line)
      return line
    }

    /^[[:space:]]*\{/ {
      id = ""
      title = ""
      focused = "false"
    }

    /"focused":/ {
      focused = ($0 ~ /true/) ? "true" : "false"
    }

    /"id":/ {
      id = json_string_value($0)
    }

    /"title":/ {
      title = json_string_value($0)
    }

    /^[[:space:]]*\}/ {
      if (id != "" && title == wanted) {
        if (focused == "true") {
          print id
          found = 1
          exit
        }
        fallback = id
      }
    }

    END {
      if (!found && fallback != "") {
        print fallback
      }
    }
  '
}

terminal_open_session() {
  local session="$1"
  local title="${2:-$1}"

  local cmd="cd $(printf %q "$WORKING_DIR") && exec tmux -S $(printf %q "$TMUX_SOCKET") attach-session -t $(printf %q "$session")"

  # Open every role in its own Otty window, not as a tab of an existing window.
  "$_otty_cli" open -q --command "$cmd" --title "$title" "$WORKING_DIR" >/dev/null 2>&1

  local window_id
  for _ in {1..20}; do
    window_id="$(_otty_window_id_by_title "$title")"
    [[ -n "$window_id" ]] && break
    sleep 0.1
  done

  if [[ -z "$window_id" ]]; then
    echo "Failed to locate Otty window for title: $title" >&2
    return 1
  fi

  echo "$window_id"
}

terminal_window_exists() {
  local window_id="$1"
  [[ -n "$window_id" ]] || return 1

  "$_otty_cli" window show --json --window "$window_id" >/dev/null 2>&1
}

terminal_close_window() {
  local window_id="$1"
  [[ -n "$window_id" ]] || return 0

  "$_otty_cli" window close --window "$window_id" --force -q >/dev/null 2>&1 || true
}
