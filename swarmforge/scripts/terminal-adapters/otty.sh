#!/usr/bin/env zsh

# Otty (io.appmakes.otty) terminal adapter. Otty is driven through its control
# CLI rather than AppleScript: `otty window new` opens a window running a
# command, `otty window list/show/close` manage windows by id (w_<UUID>).
#
# `otty window new` does not echo the new window's id, so terminal_open_session
# diffs the window-id set before/after the create to recover it. SwarmForge
# opens surfaces one at a time, so there is no concurrency race in the diff.

terminal_backend_label() {
  echo "Otty"
}

terminal_backend_can_open_sessions() {
  return 0
}

terminal_backend_tracks_windows() {
  return 0
}

terminal_window_exists() {
  local window_id="$1"
  [[ -n "$window_id" ]] || return 1
  # `otty window show` exits 0 when the window exists, non-zero (4) otherwise.
  otty window show "$window_id" --json >/dev/null 2>&1
}

_otty_window_ids() {
  otty window list --json 2>/dev/null | grep -oE 'w_[0-9A-Fa-f-]+' | sort -u
}

terminal_open_session() {
  local session="$1"
  local title="$2"
  # $3 (sibling/previous window id) is unused: each role gets its own window.
  local attach_cmd="cd ${(q)WORKING_DIR} && exec tmux -S ${(q)TMUX_SOCKET} attach-session -t ${(q)session}"

  local before after newid
  before="$(_otty_window_ids)"
  otty window new --cwd "$WORKING_DIR" --title "$title" --command "$attach_cmd" --json >/dev/null 2>&1
  after="$(_otty_window_ids)"
  newid="$(comm -13 <(printf '%s\n' "$before") <(printf '%s\n' "$after") | head -1)"
  echo "$newid"
}

terminal_close_window() {
  local window_id="$1"
  [[ -n "$window_id" ]] || return 0
  otty window close "$window_id" -y >/dev/null 2>&1 || true
}
