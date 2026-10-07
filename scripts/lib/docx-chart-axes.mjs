/** Chart-axis corrections applied to the pinned engine at build time.
 * No document mutation, runtime prototype replacement, or network dependency.
 * Methods intentionally use the engine's existing SVG factory and chart cache.
 */
import ts from "typescript";

export class ChartAxes {
  chartChild(node, name) {
    return (
      Array.from(node?.childNodes ?? []).find(
        (child) =>
          child.nodeType === 1 &&
          child.localName === name &&
          [
            "http://schemas.openxmlformats.org/drawingml/2006/chart",
            "http://purl.oclc.org/ooxml/drawingml/chart",
          ].includes(child.namespaceURI),
      ) ?? null
    );
  }

  chartNumber(node, name) {
    const raw = this.chartChild(node, name)?.getAttribute("val");
    return raw != null && raw.trim() && Number.isFinite(Number(raw))
      ? Number(raw)
      : null;
  }

  chartBoolean(node) {
    return (
      !!node &&
      !["0", "false", "off"].includes(
        (node.getAttribute("val") ?? "1").toLowerCase(),
      )
    );
  }

  chartTitleText(title) {
    if (!title) return "";
    const rich = this.chartChild(this.chartChild(title, "tx"), "rich");
    if (!rich) return this.chartText(title);
    const paragraphs = Array.from(rich.childNodes).filter(
      (n) => n.nodeType === 1 && n.localName === "p",
    );
    return paragraphs
      .map((p) =>
        Array.from(p.getElementsByTagNameNS(p.namespaceURI, "t"))
          .map((t) => t.textContent ?? "")
          .join(""),
      )
      .join("\n");
  }

  extractChartTitle(root) {
    // Axis titles live under plotArea; a recursive title search steals them.
    const chart =
      root?.localName === "chart" ? root : this.chartChild(root, "chart");
    return this.chartTitleText(this.chartChild(chart, "title"));
  }

  resolveChartAxes(root, type, selectedGroup = null) {
    const chart =
        root?.localName === "chart" ? root : this.chartChild(root, "chart"),
      plot = this.chartChild(chart, "plotArea");
    const group = selectedGroup ?? this.chartChild(plot, type);
    if (!group) return null;
    const ids = Array.from(group.childNodes)
      .filter(
        (n) =>
          n.nodeType === 1 &&
          n.localName === "axId" &&
          n.namespaceURI === group.namespaceURI,
      )
      .map((n) => n.getAttribute("val"));
    const axes = Array.from(plot.childNodes).filter(
      (n) =>
        n.nodeType === 1 &&
        n.namespaceURI === plot.namespaceURI &&
        /^(catAx|dateAx|valAx)$/.test(n.localName) &&
        ids.includes(this.chartChild(n, "axId")?.getAttribute("val")),
    );
    const category =
      axes.find((n) => n.localName === "dateAx") ??
      axes.find((n) => n.localName === "catAx");
    const value =
      axes.find(
        (n) =>
          n.localName === "valAx" &&
          (!category ||
            this.chartChild(category, "crossAx")?.getAttribute("val") ===
              this.chartChild(n, "axId")?.getAttribute("val")),
      ) ?? axes.find((n) => n.localName === "valAx");
    return {
      category,
      value,
      date1904: this.chartBoolean(this.chartChild(root, "date1904")),
    };
  }

  formatChartDateLabel(raw, format, date1904 = false) {
    if (typeof raw !== "string" || !raw.trim() || !Number.isFinite(Number(raw)))
      return raw;
    const serial = Number(raw),
      day = Math.floor(serial);
    // Reject values outside the representable spreadsheet calendar, not labels.
    if (day < 0 || day > (date1904 ? 2957003 : 2958465)) return raw;
    const ms = Math.min(86399999, Math.round((serial - day) * 86400000));
    const date = new Date(
      Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 31) +
        (day - (!date1904 && day > 60 ? 1 : 0)) * 86400000 +
        ms,
    );
    const year = !date1904 && day === 60 ? 1900 : date.getUTCFullYear();
    const month = !date1904 && day === 60 ? 2 : date.getUTCMonth() + 1;
    const dom = !date1904 && day === 60 ? 29 : date.getUTCDate();
    const pad = (n, length) => String(n).padStart(length, "0");
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const weekdays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    let section = "",
      quoted = false;
    for (let i = 0; i < (format ?? "").length; i++) {
      const c = format[i];
      if (c === "\\" && i + 1 < format.length) {
        section += c + format[++i];
        continue;
      }
      if (c === '"') quoted = !quoted;
      if (c === ";" && !quoted) break;
      section += c;
    }
    if (!section || quoted) return raw;
    const tokens =
      section.match(
        /"[^"]*"|\\.|\[\$-[\w-]+\]|AM\/PM|A\/P|y+|m+|d+|h+|s+|./gi,
      ) ?? [];
    if (!tokens.some((t) => /^(y+|m+|d+|h+|s+)$/i.test(t))) return raw;
    const ampm = tokens.some((t) => /^(AM\/PM|A\/P)$/i.test(t));
    let result = "";
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i],
        t = token.toLowerCase();
      if (token.startsWith('"')) {
        result += token.slice(1, -1);
        continue;
      }
      if (token.startsWith("\\")) {
        result += token.slice(1);
        continue;
      }
      // Only an English language marker is handled; do not fabricate other locales.
      if (/^\[\$-/i.test(token)) {
        if (!/^\[\$-(409|en-us)\]$/i.test(token)) return raw;
        continue;
      }
      const prev = tokens
        .slice(0, i)
        .reverse()
        .find((v) => /^[ymdhs]+$/i.test(v));
      const next = tokens.slice(i + 1).find((v) => /^[ymdhs]+$/i.test(v));
      if (/^y{1,4}$/.test(t))
        result += t.length <= 2 ? pad(year % 100, 2) : pad(year, 4);
      else if (/^m{1,5}$/.test(t)) {
        const minute = /^h+$/i.test(prev ?? "") || /^s+$/i.test(next ?? "");
        if (minute)
          result +=
            t.length === 1
              ? date.getUTCMinutes()
              : pad(date.getUTCMinutes(), 2);
        else
          result +=
            t.length === 1
              ? month
              : t.length === 2
                ? pad(month, 2)
                : t.length === 3
                  ? months[month - 1].slice(0, 3)
                  : t.length === 4
                    ? months[month - 1]
                    : months[month - 1][0];
      } else if (/^d{1,4}$/.test(t))
        result +=
          t.length === 1
            ? dom
            : t.length === 2
              ? pad(dom, 2)
              : t.length === 3
                ? weekdays[date.getUTCDay()].slice(0, 3)
                : weekdays[date.getUTCDay()];
      else if (/^h{1,2}$/.test(t)) {
        const h = ampm ? date.getUTCHours() % 12 || 12 : date.getUTCHours();
        result += t.length === 1 ? h : pad(h, 2);
      } else if (/^s{1,2}$/.test(t))
        result +=
          t.length === 1 ? date.getUTCSeconds() : pad(date.getUTCSeconds(), 2);
      else if (/^(am\/pm|a\/p)$/.test(t)) {
        const v = date.getUTCHours() < 12 ? "AM" : "PM";
        result +=
          token === t
            ? (t === "a/p" ? v[0] : v).toLowerCase()
            : t === "a/p"
              ? v[0]
              : v;
      } else if (/^[\s/.,:\-年年月日时分秒()]$/.test(token)) result += token;
      else return raw; // Unknown numeric, conditional, escaped or locale grammar.
    }
    return result;
  }

  drawChartAxisTitles(svg, axes) {
    for (const axis of [axes?.category, axes?.value]) {
      if (!axis || this.chartBoolean(this.chartChild(axis, "delete"))) continue;
      const title = this.chartChild(axis, "title"),
        text = this.chartTitleText(title);
      if (!text) continue;
      const pos =
        this.chartChild(axis, "axPos")?.getAttribute("val") ??
        (axis.localName === "valAx" ? "l" : "b");
      const manual = this.chartChild(
        this.chartChild(title, "layout"),
        "manualLayout",
      );
      const x = this.chartNumber(manual, "x"),
        y = this.chartNumber(manual, "y");
      const xEdge =
        this.chartChild(manual, "xMode")?.getAttribute("val") === "edge";
      const yEdge =
        this.chartChild(manual, "yMode")?.getAttribute("val") === "edge";
      const defaults = {
        b: [330, 349],
        t: [330, 50],
        l: [16, 185],
        r: [625, 185],
      }[pos] ?? [330, 349];
      const manualPosition = x != null && y != null && xEdge && yEdge;
      const tx = manualPosition ? x * 640 : defaults[0],
        ty = manualPosition ? y * 360 : defaults[1];
      const label = this.svgText(
        text,
        tx,
        ty,
        manualPosition ? "start" : "middle",
        "12px",
      );
      label.setAttribute(
        "data-docx-chart-axis-title",
        this.chartChild(axis, "axId")?.getAttribute("val") ?? pos,
      );
      if (manualPosition) label.setAttribute("dominant-baseline", "hanging");
      else if (pos === "l" || pos === "r")
        label.setAttribute(
          "transform",
          `rotate(${pos === "l" ? -90 : 90} ${tx} ${ty})`,
        );
      svg.appendChild(label);
    }
  }

  renderChartSvg(xml) {
    const root = xml.documentElement,
      type = this.detectChartType(root),
      series = this.parseChartSeries(root, type);
    const svg = this.createSvgElement("svg", {
      style: { width: "100%", height: "100%", display: "block" },
    });
    svg.setAttribute("viewBox", "0 0 640 360");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const title = this.extractChartTitle(root);
    if (title) {
      const node = this.svgText(title, 320, 24, "middle", "14px", "bold");
      node.setAttribute("data-docx-chart-title", "true");
      svg.appendChild(node);
    }
    if (!series.length || series.every((s) => !s.values.length)) {
      svg.appendChild(this.svgText("Chart", 320, 180, "middle", "18px"));
      return svg;
    }
    const plot = this.chartChild(this.chartChild(root, "chart"), "plotArea");
    const groups = Array.from(plot?.childNodes ?? []).filter(
      (n) =>
        n.nodeType === 1 &&
        n.namespaceURI === plot.namespaceURI &&
        n.localName.endsWith("Chart"),
    );
    if (
      groups.length > 1 &&
      groups.every(
        (n) =>
          this.resolveChartAxes(root, n.localName, n)?.category &&
          this.resolveChartAxes(root, n.localName, n)?.value,
      ) &&
      groups.every(
        (n) =>
          ["barChart", "lineChart"].includes(n.localName) &&
          (!this.chartChild(n, "barDir") ||
            this.chartChild(n, "barDir").getAttribute("val") === "col") &&
          !["stacked", "percentStacked"].includes(
            this.chartChild(n, "grouping")?.getAttribute("val"),
          ),
      )
    ) {
      this.drawCombinedChartAxes(svg, root, groups);
      return svg;
    }
    const axes = this.resolveChartAxes(root, type);
    if (type === "lineChart" && axes?.category?.localName === "dateAx")
      this.drawDateLineChart(svg, series, axes, {
        seriesNodes: Array.from(this.chartChild(plot, type).childNodes).filter(
          (n) => n.nodeType === 1 && n.localName === "ser",
        ),
      });
    else if (type === "pieChart" || type === "doughnutChart")
      this.drawPieChart(svg, series[0]);
    else if (["lineChart", "scatterChart", "areaChart"].includes(type))
      this.drawLineChart(svg, series, type === "areaChart");
    else this.drawBarChart(svg, series);
    this.drawChartAxisTitles(svg, axes);
    return svg;
  }

  syncChartAxisLegend(svg) {
    const colors = new Map();
    for (const mark of svg.querySelectorAll("[data-docx-chart-series-index]")) {
      const index = Number(mark.getAttribute("data-docx-chart-series-index"));
      if (!colors.has(index)) colors.set(index, mark.style.fill);
    }
    const swatches =
      svg.querySelector("[data-docx-chart-legend]")?.querySelectorAll("rect") ??
      [];
    swatches.forEach((rect, i) => {
      if (colors.has(i)) rect.style.fill = colors.get(i);
    });
  }

  chartAxisNumberLabel(value, format) {
    const m = /^(0)(?:\.(0{1,10}))?(%)?$/.exec(format ?? "");
    if (!m) return String(value);
    return (
      (value * (m[3] ? 100 : 1)).toFixed(m[2]?.length ?? 0) + (m[3] ? "%" : "")
    );
  }

  drawCombinedChartAxes(svg, root, groups) {
    let offset = 0;
    const names = [];
    for (const group of groups) {
      const axes = this.resolveChartAxes(root, group.localName, group);
      const series = this.parseChartSeries(group, group.localName);
      if (!axes?.category || !axes.value || !series.length) continue;
      const region = this.createSvgElement("g");
      region.setAttribute("data-docx-chart-axis-group", group.localName);
      region.setAttribute(
        "data-docx-chart-value-axis-id",
        this.chartChild(axes.value, "axId").getAttribute("val"),
      );
      svg.appendChild(region);
      this.drawDateLineChart(region, series, axes, {
        type: group.localName,
        group,
        offset,
        noLegend: true,
        seriesNodes: Array.from(group.childNodes).filter(
          (n) => n.nodeType === 1 && n.localName === "ser",
        ),
      });
      this.drawChartAxisTitles(svg, axes);
      offset += series.length;
      names.push(...series.map((s) => s.name));
    }
    this.drawBottomLegend(svg, names, 335);
    this.syncChartAxisLegend(svg);
  }

  chartDateTicks(axis, values, min, max, date1904) {
    // Bound explicit major units before iterating; malformed units cannot hang rendering.
    const step = this.chartNumber(axis, "majorUnit");
    const unit =
      this.chartChild(axis, "majorTimeUnit")?.getAttribute("val") ?? "days";
    if (step != null && step > 0) {
      if (unit === "days") {
        const count = Math.floor((max - min) / step + 1e-9) + 1;
        if (count <= 1000)
          return Array.from({ length: count }, (_, i) => min + i * step);
      } else if (Number.isInteger(step) && ["months", "years"].includes(unit)) {
        const first = this.formatChartDateLabel(
          String(min),
          "yyyy/mm/dd",
          date1904,
        );
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(first)) {
          const [year, month, day] = first.split("/").map(Number),
            ticks = [];
          for (let i = 0; i < 1000; i++) {
            const m = month - 1 + i * step * (unit === "years" ? 12 : 1);
            const base = new Date(Date.UTC(year, m, 1));
            const lastDay = new Date(
              Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
            ).getUTCDate();
            const date = Date.UTC(
              base.getUTCFullYear(),
              base.getUTCMonth(),
              Math.min(day, lastDay),
            );
            let serial =
              (date -
                Date.UTC(
                  date1904 ? 1904 : 1899,
                  date1904 ? 0 : 11,
                  date1904 ? 1 : 31,
                )) /
              86400000;
            if (!date1904 && date >= Date.UTC(1900, 2, 1)) serial++;
            serial += min - Math.floor(min);
            if (!Number.isFinite(serial) || serial > max + 1e-9) break;
            if (serial >= min - 1e-9) ticks.push(serial);
          }
          if (ticks.length && ticks.length < 1000) return ticks;
        }
      }
    }
    return [...new Set(values)].filter((v) => v >= min && v <= max);
  }

  drawDateLineChart(svg, series, axes, config = {}) {
    const child = (n, k) => this.chartChild(n, k),
      num = (n, k) => this.chartNumber(n, k);
    const cat = axes.category,
      val = axes.value;
    const xs = series.map((s) =>
      s.categories.map((x) =>
        x.trim() && Number.isFinite(Number(x)) ? Number(x) : NaN,
      ),
    );
    const categoryAxis = cat?.localName !== "dateAx";
    const count = series.reduce(
      (n, s) => Math.max(n, s.values.length, s.categories.length),
      1,
    );
    const finiteX = xs.flat().filter(Number.isFinite);
    if (!finiteX.length && !categoryAxis) {
      this.drawLineChart(svg, series);
      return;
    }
    const cs = child(cat, "scaling"),
      vs = child(val, "scaling");
    let xmin = categoryAxis
        ? 0
        : (num(cs, "min") ??
          finiteX.reduce((a, b) => Math.min(a, b), Infinity)),
      xmax = categoryAxis
        ? count
        : (num(cs, "max") ??
          finiteX.reduce((a, b) => Math.max(a, b), -Infinity));
    if (xmax <= xmin) xmax = xmin + 1;
    const auto = this.chartValueBounds(series);
    let ymin = num(vs, "min") ?? auto.min,
      ymax = num(vs, "max") ?? auto.max;
    if (ymax <= ymin) {
      ymin = auto.min;
      ymax = auto.max;
    }
    if (!Number.isFinite(xmax - xmin) || !Number.isFinite(ymax - ymin)) return;
    const xr = child(cs, "orientation")?.getAttribute("val") === "maxMin";
    const yr = child(vs, "orientation")?.getAttribute("val") === "maxMin";
    const xp = (x) =>
      60 +
      (xr ? 1 - (x - xmin) / (xmax - xmin) : (x - xmin) / (xmax - xmin)) * 540;
    const position = (x, i) => xp(categoryAxis ? i + 0.5 : x);
    const rightAxis = child(val, "axPos")?.getAttribute("val") === "r";
    const yp = (y) =>
      300 -
      (yr ? 1 - (y - ymin) / (ymax - ymin) : (y - ymin) / (ymax - ymin)) * 230;
    const deletedX = this.chartBoolean(child(cat, "delete")),
      deletedY = this.chartBoolean(child(val, "delete"));
    const yc = child(val, "crosses")?.getAttribute("val");
    const xc = child(cat, "crosses")?.getAttribute("val");
    const ycross = Math.min(
      ymax,
      Math.max(
        ymin,
        num(val, "crossesAt") ??
          (yc === "max" ? ymax : yc === "min" ? ymin : 0),
      ),
    );
    const xcross = Math.min(
      xmax,
      Math.max(xmin, num(cat, "crossesAt") ?? (xc === "max" ? xmax : xmin)),
    );
    if (!deletedX)
      svg.appendChild(this.svgLine(60, yp(ycross), 600, yp(ycross)));
    if (!deletedY)
      svg.appendChild(
        this.svgLine(
          rightAxis ? 600 : xp(xcross),
          300,
          rightAxis ? 600 : xp(xcross),
          70,
        ),
      );
    svg.setAttribute("data-docx-chart-x-range", `${xmin},${xmax}`);
    svg.setAttribute("data-docx-chart-y-range", `${ymin},${ymax}`);
    // A local SVG viewport clips out-of-range values without altering their data.
    const marks = this.createSvgElement("svg");
    for (const [k, v] of Object.entries({
      x: 60,
      y: 70,
      width: 540,
      height: 230,
      viewBox: "60 70 540 230",
      overflow: "hidden",
    }))
      marks.setAttribute(k, String(v));
    marks.setAttribute("data-docx-chart-date-plot", "true");
    svg.appendChild(marks);
    series.forEach((s, si) => {
      const sourceSeries = config.seriesNodes?.[si];
      const ns = "http://schemas.openxmlformats.org/drawingml/2006/main";
      const sp = child(sourceSeries, "spPr"),
        stroke = sp?.getElementsByTagNameNS(ns, "ln")[0];
      const authoredColor = (config.type === "barChart" ? sp : stroke)
        ?.getElementsByTagNameNS(ns, "srgbClr")[0]
        ?.getAttribute("val");
      const color =
        authoredColor && /^[0-9A-F]{6}$/i.test(authoredColor)
          ? "#" + authoredColor
          : this.chartColor(si + (config.offset ?? 0));
      const lineWidth = stroke?.getAttribute("w");
      const width =
        lineWidth && Number.isFinite(Number(lineWidth))
          ? Math.max(0, Number(lineWidth) / 9525)
          : 2;
      const markers =
        child(child(sourceSeries, "marker"), "symbol")?.getAttribute("val") !==
        "none";
      let part = [];
      const flush = () => {
        if (!part.length) return;
        const p = this.createSvgElement("path");
        p.setAttribute(
          "d",
          part.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" "),
        );
        p.style.stroke = color;
        p.style.strokeWidth = String(width);
        p.style.fill = "none";
        marks.appendChild(p);
        part = [];
      };
      s.values.forEach((v, i) => {
        const x = xs[si][i];
        if ((!categoryAxis && !Number.isFinite(x)) || !Number.isFinite(v)) {
          flush();
          return;
        }
        const px = position(x, i),
          py = yp(v);
        const bar = config.type === "barChart";
        if (!bar) part.push([px, py]);
        const c = this.createSvgElement(bar ? "rect" : "circle");
        const attrs = {
          "data-docx-chart-point-index": i,
          "data-docx-chart-series-index": si + (config.offset ?? 0),
          "data-docx-chart-date-value": x,
          "data-docx-chart-center-x": px,
          "data-docx-chart-center-y": py,
        };
        if (bar) {
          const groupWidth = 540 / count,
            gap = Math.max(
              0,
              Math.min(500, num(config.group, "gapWidth") ?? 150),
            );
          const bw = groupWidth / (series.length + gap / 100);
          const base = yp(Math.min(ymax, Math.max(ymin, 0)));
          Object.assign(attrs, {
            x: px - (series.length * bw) / 2 + si * bw,
            y: Math.min(py, base),
            width: bw,
            height: Math.abs(base - py),
          });
        } else Object.assign(attrs, { cx: px, cy: py, r: markers ? 3 : 0 });
        for (const [k, t] of Object.entries(attrs))
          if (Number.isFinite(t)) c.setAttribute(k, String(t));
        c.style.fill = color;
        marks.appendChild(c);
      });
      flush();
    });
    if (!deletedX && child(cat, "tickLblPos")?.getAttribute("val") !== "none") {
      const format =
        child(cat, "numFmt")?.getAttribute("formatCode") ??
        (categoryAxis ? "General" : "yyyy/m/d");
      // Tick density is a layout choice; serial-to-position mapping is not.
      const dates = categoryAxis
        ? series[0].categories.map((raw, i) => ({
            raw,
            i,
            d: Number(raw),
            x: position(Number(raw), i),
          }))
        : this.chartDateTicks(cat, finiteX, xmin, xmax, axes.date1904).map(
            (d) => ({ raw: String(d), d, x: xp(d) }),
          );
      dates.sort((a, b) => a.x - b.x);
      let right = -Infinity,
        lastText = null;
      for (const item of dates) {
        const { d, x } = item;
        const text = this.formatChartDateLabel(item.raw, format, axes.date1904),
          half = this.chartLegendTextWidth(text) / 2;
        if (text === lastText || x - half < right + 4) continue;
        const label = this.svgText(text, x, 318, "middle", "10px");
        label.setAttribute(
          "data-docx-chart-date-tick",
          Number.isFinite(d) ? String(d) : item.raw,
        );
        if (categoryAxis)
          label.setAttribute("data-docx-chart-category-index", String(item.i));
        svg.appendChild(label);
        right = x + half;
        lastText = text;
      }
    }
    if (!deletedY && child(val, "tickLblPos")?.getAttribute("val") !== "none") {
      const major = num(val, "majorUnit"),
        step = major && major > 0 ? major : (ymax - ymin) / 5;
      const first = ymin,
        count = Math.floor((ymax - first) / step + 1e-8) + 1;
      if (count > 0 && count <= 100)
        for (let i = 0; i < count; i++) {
          const value = Number((first + i * step).toPrecision(12)),
            label = this.svgText(
              this.chartAxisNumberLabel(
                value,
                child(val, "numFmt")?.getAttribute("formatCode"),
              ),
              rightAxis ? 606 : 54,
              yp(value) + 3,
              rightAxis ? "start" : "end",
              "10px",
            );
          label.setAttribute("data-docx-chart-value-tick", String(value));
          svg.appendChild(label);
        }
    }
    if (!config.noLegend) {
      this.drawBottomLegend(
        svg,
        series.map((s) => s.name),
        335,
      );
      this.syncChartAxisLegend(svg);
    }
  }
}

/** Replace only named methods, preserving every other pinned engine method. */
export function transformChartAxes(source, filename = "docx.js") {
  const parsed = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  if (parsed.parseDiagnostics.length)
    throw new Error("Invalid baseline engine syntax");
  const methods = Object.getOwnPropertyNames(ChartAxes.prototype).filter(
    (n) => n !== "constructor",
  );
  const replacements = new Set(["renderChartSvg", "extractChartTitle"]);
  const additions = methods
    .filter((n) => !replacements.has(n))
    .map((n) => ChartAxes.prototype[n].toString())
    .join("\n");
  const edits = [],
    seen = new Set();
  const visit = (node) => {
    if (ts.isMethodDeclaration(node)) {
      const name = node.name.getText(parsed);
      if (replacements.has(name)) {
        if (seen.has(name))
          throw new Error("Ambiguous renderer method " + name);
        seen.add(name);
        edits.push([
          node.getStart(parsed),
          node.end,
          ChartAxes.prototype[name].toString() +
            (name === "renderChartSvg" ? "\n" + additions : ""),
        ]);
      } else if (methods.includes(name))
        throw new Error("Chart-axis update already applied");
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  if (seen.size !== replacements.size)
    throw new Error("Expected two chart renderer methods");
  for (const [a, b, text] of edits.sort((a, b) => b[0] - a[0]))
    source = source.slice(0, a) + text + source.slice(b);
  if (
    ts.createSourceFile(
      filename,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    ).parseDiagnostics.length
  )
    throw new Error("Invalid transformed engine syntax");
  return source;
}
