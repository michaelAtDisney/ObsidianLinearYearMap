"use strict";

const obsidian = require('obsidian');

const VIEW_TYPE_LINEAR_CALENDAR = "linear-calendar-view";

const DEFAULT_SETTINGS = {
    triggerTag: "#linearCal",
    categories: [
        { name: "Work", color: "#4a90e2" },
        { name: "Personal", color: "#2ecc71" },
        { name: "Milestone", color: "#7ed321" },
        { name: "High-Energy", color: "#d0021b" }
    ],
    eventsFolder: "Linear Calendar Events"
};

class LinearCalendarView extends obsidian.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentYear = 2026;
        this.hiddenCategories = new Set();
    }
    getViewType() { return VIEW_TYPE_LINEAR_CALENDAR; }
    getDisplayText() { return `${this.currentYear} Linear Year Map`; }

    async onOpen() {
        this.render();

        // Debounce the refresh to prevent excessive re-renders during editing
        this.debouncedRefresh = obsidian.debounce((file) => {
            const cache = this.app.metadataCache.getFileCache(file);
            // Only refresh if the modified file has the trigger tag
            if (cache && obsidian.getAllTags(cache)?.includes(this.plugin.settings.triggerTag)) {
                this.render();
            }
        }, 1000, true);

        this.registerEvent(this.app.metadataCache.on('changed', (file) => this.debouncedRefresh(file)));
        this.registerEvent(this.app.vault.on('rename', (file) => this.debouncedRefresh(file)));
    }

    async moveView() {
        const workspace = this.app.workspace;
        const savedYear = this.currentYear;
        const savedHidden = this.hiddenCategories;
        const isSidebar = this.leaf.getRoot() === workspace.rightSplit || this.leaf.getRoot() === workspace.leftSplit;

        const targetLeaf = isSidebar ? workspace.getLeaf('tab') : workspace.getRightLeaf(false);

        this.leaf.detach();
        await targetLeaf.setViewState({ type: VIEW_TYPE_LINEAR_CALENDAR, active: true });

        if (targetLeaf.view && targetLeaf.view.getViewType() === VIEW_TYPE_LINEAR_CALENDAR) {
            targetLeaf.view.currentYear = savedYear;
            targetLeaf.view.hiddenCategories = savedHidden;
            targetLeaf.view.render();
        }
        workspace.revealLeaf(targetLeaf);
    }

    parseDate(dateInput) {
        if (!dateInput) return null;
        if (dateInput instanceof Date) return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
        const dateStr = String(dateInput);
        const parts = dateStr.split(/[/.-]/);
        if (parts.length === 3) {
            let y, m, d;
            if (parts[2].length === 4) { y = parseInt(parts[2]); m = parseInt(parts[0]) - 1; d = parseInt(parts[1]); }
            else if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]) - 1; d = parseInt(parts[2]); }
            return new Date(y, m, d);
        }
        let d = new Date(dateInput);
        return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    async render() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("linear-cal-view-container");

        const controlBar = container.createDiv({ cls: "cal-controls" });
        controlBar.createEl("button", { text: "←" }).onclick = () => { this.currentYear--; this.render(); };
        controlBar.createEl("span", { text: this.currentYear.toString(), cls: "current-year-display" });
        controlBar.createEl("button", { text: "→" }).onclick = () => { this.currentYear++; this.render(); };

        const todayBtn = controlBar.createEl("button", { text: "📍 Today", cls: "today-btn" });
        todayBtn.onclick = () => {
            this.currentYear = new Date().getFullYear(); // Ensure we go to the actual current year
            this.render();

            // Find today cell and animate
            setTimeout(() => {
                const todayCell = container.querySelector('.day-cell.is-today');
                if (todayCell) {
                    todayCell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    todayCell.addClass('pulse-active');
                    setTimeout(() => todayCell.removeClass('pulse-active'), 2000);
                }
            }, 100);
        };
        controlBar.createEl("button", { text: "+ Add Event", cls: "add-event-btn" }).onclick = () => new AddEventModal(this.app, this.plugin).open();
        controlBar.createEl("button", { text: "⇋ View", title: "Toggle View" }).onclick = () => this.moveView();

        const calendarGrid = container.createDiv({ cls: "linear-grid" });
        const dayLabels = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const CELL_WIDTH = 34;
        const now = new Date();
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const createHeader = (parent) => {
            const row = parent.createDiv({ cls: "day-header-row" });
            row.createDiv({ cls: "month-label", text: "" });
            const cont = row.createDiv({ cls: "days-container" });
            for (let i = 0; i < 38; i++) {
                const isWeekend = (i % 7 === 0 || i % 7 === 6);
                cont.createDiv({ cls: `day-cell header ${isWeekend ? 'weekend-tint' : ''}`, text: dayLabels[i % 7] });
            }
        };

        createHeader(calendarGrid);

        const monthContainers = {};
        const occupancy = months.map(() => Array.from({ length: 38 }, () => []));

        months.forEach((month, idx) => {
            const row = calendarGrid.createDiv({ cls: "month-row" });
            row.createDiv({ cls: "month-label", text: month });
            const mStart = new Date(this.currentYear, idx, 1);
            const mEnd = new Date(this.currentYear, idx + 1, 0);
            const startDayIndex = mStart.getDay();
            const container = row.createDiv({ cls: "days-container" });
            monthContainers[idx] = { container, mStart, mEnd, rowEl: row };

            for (let i = 0; i < 38; i++) {
                const isWeekend = (i % 7 === 0 || i % 7 === 6);
                const dayNumber = i - startDayIndex + 1;
                const cell = container.createDiv({ cls: `day-cell ${isWeekend ? 'weekend-tint' : ''}` });
                if (dayNumber > 0 && dayNumber <= mEnd.getDate()) {
                    cell.createSpan({ text: dayNumber.toString(), cls: "day-number" });
                    const checkDate = new Date(this.currentYear, idx, dayNumber);
                    if (checkDate.getTime() === todayDate.getTime()) cell.addClass("is-today");
                } else { cell.addClass("spacer"); }
            }
        });

        const legend = container.createDiv({ cls: "cal-legend" });
        const colorMap = {};
        this.plugin.settings.categories.forEach(c => {
            const itm = legend.createDiv({ cls: `legend-item ${this.hiddenCategories.has(c.name) ? 'is-hidden' : ''}` });
            itm.createDiv({ cls: "legend-color", attr: { style: `background-color: ${c.color}` } });
            itm.createSpan({ text: c.name });
            itm.onclick = () => {
                if (this.hiddenCategories.has(c.name)) this.hiddenCategories.delete(c.name);
                else this.hiddenCategories.add(c.name);
                this.render();
            };
            colorMap[c.name.toLowerCase()] = c.color;
        });

        const triggerTag = this.plugin.settings.triggerTag;
        this.app.vault.getMarkdownFiles().forEach(file => {
            try {
                const cache = this.app.metadataCache.getFileCache(file);
                if (!obsidian.getAllTags(cache)?.includes(triggerTag)) return;
                const fm = cache?.frontmatter;
                let start = this.parseDate(fm?.start_date) || this.parseDate(file.stat.ctime);
                let end = this.parseDate(fm?.end_date) || start;
                const category = String(fm?.category || "").trim();
                const color = fm?.color || colorMap[category.toLowerCase()] || '#cccccc';

                // Check if category is hidden
                // We match against the defined categories. If the metadata category name (case-insensitive) matches a hidden category name, skip.
                const isHidden = this.plugin.settings.categories.some(c =>
                    c.name.toLowerCase() === category.toLowerCase() && this.hiddenCategories.has(c.name)
                );

                if (isHidden) return;

                const recur = String(fm?.reoccurrence || fm?.recurrence || "").toLowerCase();

                const drawEvent = (s, e, isRecur = false) => {
                    months.forEach((_, mIdx) => {
                        const { container, mStart, mEnd, rowEl } = monthContainers[mIdx];
                        const oStart = new Date(Math.max(s, mStart));
                        const oEnd = new Date(Math.min(e, mEnd));

                        if (oStart <= oEnd && oStart.getMonth() === mIdx) {
                            const startIndex = mStart.getDay() + (oStart.getDate() - 1);
                            const endIndex = mStart.getDay() + (oEnd.getDate() - 1);

                            let slot = 0;
                            while (true) {
                                let collision = false;
                                for (let i = startIndex; i <= endIndex; i++) {
                                    if (occupancy[mIdx][i] && occupancy[mIdx][i].includes(slot)) { collision = true; break; }
                                }
                                if (!collision) break;
                                slot++;
                            }

                            for (let i = startIndex; i <= endIndex; i++) {
                                if (occupancy[mIdx][i]) occupancy[mIdx][i].push(slot);
                            }

                            const bar = container.createDiv({ cls: `event-label-bar ${isRecur ? 'is-recurring' : ''}` });
                            bar.style.left = `${startIndex * CELL_WIDTH}px`;
                            bar.style.width = `${((oEnd.getDate() - oStart.getDate()) + 1) * CELL_WIDTH - 2}px`;
                            bar.style.backgroundColor = color;
                            bar.style.bottom = `${10 + (slot * 28)}px`;
                            bar.setText(file.basename);
                            bar.onclick = () => this.app.workspace.getLeaf().openFile(file);

                            bar.setAttribute("aria-label", file.basename);

                            const newHeight = Math.max(65, 45 + (slot + 1) * 28);
                            rowEl.style.height = `${newHeight}px`;
                            rowEl.querySelectorAll('.day-cell').forEach(c => c.style.height = `${newHeight}px`);
                        }
                    });
                };
                if (!recur || recur === "false") drawEvent(start, end);
                else if (recur === "yearly") {
                    let ys = new Date(start); ys.setFullYear(this.currentYear);
                    drawEvent(ys, new Date(ys.getTime() + (end.getTime() - start.getTime())), true);
                }
            } catch (err) { console.error("Event draw error:", err); }
        });
        createHeader(calendarGrid);
    }
}

class AddEventModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Add New Event' });

        let name = "";
        let category = this.plugin.settings.categories[0]?.name || "";
        let startDate = new Date().toISOString().split('T')[0];
        let endDate = "";

        new obsidian.Setting(contentEl)
            .setName("Event Name")
            .addText(text => text.onChange(value => name = value));

        new obsidian.Setting(contentEl)
            .setName("Category")
            .addDropdown(drop => {
                this.plugin.settings.categories.forEach(c => drop.addOption(c.name, c.name));
                drop.setValue(category);
                drop.onChange(value => category = value);
            });

        new obsidian.Setting(contentEl)
            .setName("Start Date")
            .addText(text => {
                text.inputEl.type = "date";
                text.setValue(startDate);
                text.onChange(value => startDate = value);
            });

        new obsidian.Setting(contentEl)
            .setName("End Date (Optional)")
            .addText(text => {
                text.inputEl.type = "date";
                text.onChange(value => endDate = value);
            });

        new obsidian.Setting(contentEl)
            .addButton(btn => btn
                .setButtonText("Create Event")
                .setCta()
                .onClick(async () => {
                    if (!name) { new obsidian.Notice("Event name is required"); return; }
                    await this.createEvent(name, category, startDate, endDate);
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    async createEvent(name, category, startDate, endDate) {
        const folderPath = this.plugin.settings.eventsFolder || "Linear Calendar Events";
        const fileName = `${name.replace(/[\\/:*?"<>|]/g, "")}.md`;
        const filePath = `${folderPath}/${fileName}`;

        try {
            if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                await this.app.vault.createFolder(folderPath);
            }

            const frontmatter = [
                "---",
                `tags: ${this.plugin.settings.triggerTag.replace(/^#/, '')}`,
                `category: ${category}`,
                `start_date: ${startDate}`
            ];
            if (endDate) frontmatter.push(`end_date: ${endDate}`);
            frontmatter.push("---\n");

            await this.app.vault.create(filePath, frontmatter.join("\n"));
            new obsidian.Notice(`Event "${name}" created!`);

            // Trigger a refresh if the view is open
            // Add a small delay to ensure the metadata cache catches the new file
            setTimeout(() => {
                this.app.workspace.getLeavesOfType(VIEW_TYPE_LINEAR_CALENDAR).forEach(l => l.view.render());
            }, 300);

        } catch (err) {
            new obsidian.Notice("Error creating event file: " + err.message);
            console.error(err);
        }
    }
}

class LinearCalendarSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Linear Year Map Settings' });
        new obsidian.Setting(containerEl).setName('Trigger Tag').addText(text => text.setValue(this.plugin.settings.triggerTag).onChange(async (v) => { this.plugin.settings.triggerTag = v; await this.plugin.saveSettings(); }));
        new obsidian.Setting(containerEl).setName('Default Events Folder').addText(text => text.setValue(this.plugin.settings.eventsFolder).onChange(async (v) => { this.plugin.settings.eventsFolder = v; await this.plugin.saveSettings(); }));
        this.plugin.settings.categories.forEach((cat, idx) => {
            new obsidian.Setting(containerEl).addText(t => t.setValue(cat.name).onChange(async (v) => { this.plugin.settings.categories[idx].name = v; await this.plugin.saveSettings(); }))
                .addColorPicker(c => c.setValue(cat.color).onChange(async (v) => { this.plugin.settings.categories[idx].color = v; await this.plugin.saveSettings(); }))
                .addButton(b => b.setIcon('trash').onClick(async () => { this.plugin.settings.categories.splice(idx, 1); await this.plugin.saveSettings(); this.display(); }));
        });
        new obsidian.Setting(containerEl).addButton(b => b.setButtonText('Add Category').onClick(async () => { this.plugin.settings.categories.push({ name: 'New', color: '#ccc' }); await this.plugin.saveSettings(); this.display(); }));
    }
}

class LinearCalendarPlugin extends obsidian.Plugin {
    async onload() {
        await this.loadSettings();
        this.registerView(VIEW_TYPE_LINEAR_CALENDAR, (l) => new LinearCalendarView(l, this));
        this.addSettingTab(new LinearCalendarSettingTab(this.app, this));
        this.addRibbonIcon("calendar-days", "Open Year Map", () => this.activateView());

        this.addCommand({
            id: 'add-linear-calendar-event',
            name: 'Add New Event',
            callback: () => {
                new AddEventModal(this.app, this).open();
            }
        });
    }
    async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
    async saveSettings() { await this.saveData(this.settings); this.app.workspace.getLeavesOfType(VIEW_TYPE_LINEAR_CALENDAR).forEach(l => l.view.render()); }
    async activateView() {
        const { workspace } = this.app;
        let l = workspace.getLeavesOfType(VIEW_TYPE_LINEAR_CALENDAR)[0] || workspace.getRightLeaf(false);
        await l.setViewState({ type: VIEW_TYPE_LINEAR_CALENDAR, active: true });
        workspace.revealLeaf(l);
    }
}

module.exports = LinearCalendarPlugin;