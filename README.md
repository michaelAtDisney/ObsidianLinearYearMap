# Linear Year Map

A 12-month linear calendar for Obsidian to visualize note flow and clusters. Visualize your year at a glance with a clean, continuous timeline.

![License](https://img.shields.io/github/license/obsidian-community/obsidian-linear-calendar)

## Features

- **Continuous 12-Month View:** See the entire year laid out horizontally.
- **Event Visualization:** Automatically plot notes onto the calendar based on frontmatter dates.
- **Categories & Filtering:** Color-code events by category and toggle them on/off.
- **Efficient Auto-Refresh:** Automatically updates when you edit event files.
- **Drag & Drop (Coming Soon):** *Planned feature.*
- **Interactive:** Click events to open the corresponding note.

## Installation

### Manual Installation
1.  Download the `main.js`, `styles.css`, and `manifest.json` from the releases page (or build from source).
2.  Create a folder named `linear-calendar-plugin` in your vault's `.obsidian/plugins/` directory.
3.  Move the files into that folder.
4.  Reload Obsidian and enable "Linear Year Map" in Community Plugins settings.

## Usage

### Creating Events
You can create an event in two ways:

1.  **"Add Event" Button:** Click the `+` button in the calendar view toolbar.
2.  **Command Palette:** Run `Linear Year Map: Add New Event`.
3.  **Manual Creation:** Create a new note anywhere in your vault and add the required frontmatter (see below).

This will create a new note in your configured **Default Events Folder** with the necessary frontmatter.

### Frontmatter Configuration
To make any note appear on the calendar, simple add the **Trigger Tag** (default: `#linearCal`) and the following keys to its frontmatter:

```yaml
---
tags: linearCal
start_date: 2026-03-15
end_date: 2026-03-18  # Optional: for multi-day events
category: Work        # Optional: Matches your settings for color coding
---
```

## Settings

- **Trigger Tag:** The tag used to identify which notes are events (default: `#linearCal`).
- **Default Events Folder:** Where new events created via the plugin will be saved.
- **Categories:** Define your own categories and assign them colors.
    - *Example:* "Work" (Blue), "Personal" (Green), "Urgent" (Red).

## Support
If you enjoy this plugin, please let me know!

## Acknowledgements

This plugin differs slightly but is directly based on the **Linear Calendar** concept developed by **Nick Milo**. You can check out the original concept and digital download here: [Linking Your Thinking - Linear Calendar](https://www.linkingyourthinking.com/thank-you/download-the-linear-calendar).
