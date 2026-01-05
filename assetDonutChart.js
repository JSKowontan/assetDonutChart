(function() {
    "use strict";

    // =================================================================================
    // PART 1: BUILDER PANEL (Configuration)
    // =================================================================================
    
    const builderTemplate = document.createElement("template");
    builderTemplate.innerHTML = `
        <style>
            :host {
                display: block;
                padding: 15px;
                font-family: "72", "Segoe UI", Arial, sans-serif;
                background-color: #fafafa;
                height: 100%;
                box-sizing: border-box;
                overflow-y: auto;
            }
            h3 { margin: 0 0 10px 0; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-size: 12px; font-weight: bold; color: #333; }
            input[type="text"], input[type="number"] {
                width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 13px;
            }
            input[type="color"] { width: 100%; height: 35px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }
            .section { background: white; padding: 10px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 15px; }
        </style>

        <form id="form">
            <div class="form-group">
                <label>Chart Title</label>
                <input type="text" id="chartTitle" value="Asset Breakdown">
            </div>
            
            <div class="form-group">
                <label>Center Label</label>
                <input type="text" id="centerLabel" value="Asset">
            </div>

            <div class="section">
                <h3>Segment 1 (Left/Top)</h3>
                <div class="form-group">
                    <label>Label</label>
                    <input type="text" id="label1" value="Liabilities">
                </div>
                <div class="form-group">
                    <label>Value</label>
                    <input type="number" id="val1" value="8371">
                </div>
                <div class="form-group">
                    <label>Color</label>
                    <input type="color" id="color1" value="#ed8b36"> <!-- Orange -->
                </div>
            </div>

            <div class="section">
                <h3>Segment 2 (Right/Bottom)</h3>
                <div class="form-group">
                    <label>Label</label>
                    <input type="text" id="label2" value="Equities">
                </div>
                <div class="form-group">
                    <label>Value</label>
                    <input type="number" id="val2" value="12356">
                </div>
                <div class="form-group">
                    <label>Color</label>
                    <input type="color" id="color2" value="#4472c4"> <!-- Blue -->
                </div>
            </div>
            
            <input type="submit" style="display:none;">
        </form>
    `;

    class AssetDonutBuilder extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: "open" });
            this.shadowRoot.appendChild(builderTemplate.content.cloneNode(true));
        }

        connectedCallback() {
            const form = this.shadowRoot.getElementById("form");
            form.addEventListener("change", this._submit.bind(this));
            form.addEventListener("input", this._submit.bind(this));
        }

        _submit(e) {
            if(e) e.preventDefault();
            this.dispatchEvent(new CustomEvent("propertiesChanged", {
                detail: {
                    properties: {
                        chartTitle: this.chartTitle,
                        centerLabel: this.centerLabel,
                        label1: this.label1,
                        val1: this.val1,
                        color1: this.color1,
                        label2: this.label2,
                        val2: this.val2,
                        color2: this.color2
                    }
                }
            }));
        }

        // Getters
        get chartTitle() { return this.shadowRoot.getElementById("chartTitle").value; }
        get centerLabel() { return this.shadowRoot.getElementById("centerLabel").value; }
        get label1() { return this.shadowRoot.getElementById("label1").value; }
        get val1() { return parseFloat(this.shadowRoot.getElementById("val1").value); }
        get color1() { return this.shadowRoot.getElementById("color1").value; }
        get label2() { return this.shadowRoot.getElementById("label2").value; }
        get val2() { return parseFloat(this.shadowRoot.getElementById("val2").value); }
        get color2() { return this.shadowRoot.getElementById("color2").value; }

        // Setters
        set chartTitle(v) { this.shadowRoot.getElementById("chartTitle").value = v; }
        set centerLabel(v) { this.shadowRoot.getElementById("centerLabel").value = v; }
        set label1(v) { this.shadowRoot.getElementById("label1").value = v; }
        set val1(v) { this.shadowRoot.getElementById("val1").value = v; }
        set color1(v) { this.shadowRoot.getElementById("color1").value = v; }
        set label2(v) { this.shadowRoot.getElementById("label2").value = v; }
        set val2(v) { this.shadowRoot.getElementById("val2").value = v; }
        set color2(v) { this.shadowRoot.getElementById("color2").value = v; }
    }

    // =================================================================================
    // PART 2: MAIN WIDGET (SVG Render)
    // =================================================================================

    const widgetTemplate = document.createElement("template");
    widgetTemplate.innerHTML = `
        <style>
            :host { display: block; width: 100%; height: 100%; font-family: "72", Arial, sans-serif; }
            .container { width: 100%; height: 100%; position: relative; }
            
            /* SVG Text Styles */
            .chart-title { font-size: 20px; font-weight: bold; fill: #444; }
            .center-label { font-size: 16px; fill: #333; }
            .center-value { font-size: 20px; fill: #333; }
            .label-text { font-size: 14px; fill: #555; }
            .label-val { font-size: 14px; font-weight: bold; fill: #333; }
            .label-pct { font-size: 14px; fill: #666; }
            
            path { transition: opacity 0.3s; cursor: pointer; }
            path:hover { opacity: 0.85; }
            
            polyline { fill: none; stroke: #999; stroke-width: 1; }
        </style>
        <div class="container" id="chartContainer"></div>
    `;

    class AssetDonutChart extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: "open" });
            this.shadowRoot.appendChild(widgetTemplate.content.cloneNode(true));
            
            this._props = {
                chartTitle: "Asset Breakdown",
                centerLabel: "Asset",
                label1: "Liabilities", val1: 8371, color1: "#ed8b36",
                label2: "Equities", val2: 12356, color2: "#4472c4"
            };
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            this.render();
        }

        onCustomWidgetResize(width, height) {
            this.render();
        }

        render() {
            const container = this.shadowRoot.getElementById("chartContainer");
            const p = this._props;
            
            // Calculations
            const total = p.val1 + p.val2;
            const pct1 = total ? (p.val1 / total) : 0;
            const pct2 = total ? (p.val2 / total) : 0;

            // SVG Settings
            const width = container.clientWidth || 300;
            const height = container.clientHeight || 300;
            const cx = width / 2;
            const cy = height / 2 + 15; // Shift down slightly for title
            const radius = Math.min(width, height) / 3.5; 
            const innerRadius = radius * 0.85; // Thin donut ring
            
            // Generate SVG Paths
            // We start at -90deg (12 o'clock). 
            // Segment 1 (Liabilities) is usually on the left in the image, so we draw backwards or calc angles carefully.
            // Image shows Liabilities (Orange) approx 12 o'clock to 8 o'clock (counter-clockwise) or 0 to 144deg.
            
            // To match image exactly: 
            // Start at top (-PI/2). Slice 1 (Orange) goes Counter-Clockwise? 
            // Actually, looks like Orange is 0 to -144deg (left side) and Blue is 0 to 216deg (right side).
            
            const angle1 = pct1 * 2 * Math.PI;
            const angle2 = pct2 * 2 * Math.PI;

            // We will draw Slice 1 (Liabilities) starting from -PI/2 and going NEGATIVE (Counter Clockwise)
            // Or easier: Start at -PI/2 - angle1. End at -PI/2.
            const startAngle1 = -Math.PI / 2 - angle1;
            const endAngle1 = -Math.PI / 2;
            
            const startAngle2 = -Math.PI / 2;
            const endAngle2 = -Math.PI / 2 + angle2;

            const path1 = this._describeDonut(cx, cy, innerRadius, radius, startAngle1, endAngle1);
            const path2 = this._describeDonut(cx, cy, innerRadius, radius, startAngle2, endAngle2);

            // Calculate Label Positions (Leader Lines)
            const labelPos1 = this._getLabelPos(cx, cy, radius, startAngle1, endAngle1, true); // Left side
            const labelPos2 = this._getLabelPos(cx, cy, radius, startAngle2, endAngle2, false); // Right side

            const svg = `
                <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                    <!-- Title -->
                    <text x="10" y="25" class="chart-title">${p.chartTitle}</text>
                    
                    <!-- Slices -->
                    <path d="${path1}" fill="${p.color1}" />
                    <path d="${path2}" fill="${p.color2}" />

                    <!-- Center Text -->
                    <text x="${cx}" y="${cy - 5}" text-anchor="middle" class="center-label">${p.centerLabel}</text>
                    <text x="${cx}" y="${cy + 20}" text-anchor="middle" class="center-value">${total.toLocaleString()}</text>

                    <!-- Label 1 (Left) -->
                    <polyline points="${labelPos1.linePoints}" />
                    <text x="${labelPos1.textX}" y="${labelPos1.textY}" text-anchor="end">
                        <tspan x="${labelPos1.textX}" dy="0" class="label-text">${p.label1}</tspan>
                        <tspan x="${labelPos1.textX}" dy="16" class="label-val">${p.val1.toLocaleString()}</tspan>
                        <tspan x="${labelPos1.textX}" dy="16" class="label-pct">${(pct1 * 100).toFixed(0)}%</tspan>
                    </text>

                    <!-- Label 2 (Right) -->
                    <polyline points="${labelPos2.linePoints}" />
                    <text x="${labelPos2.textX}" y="${labelPos2.textY}" text-anchor="start">
                        <tspan x="${labelPos2.textX}" dy="0" class="label-text">${p.label2}</tspan>
                        <tspan x="${labelPos2.textX}" dy="16" class="label-val">${p.val2.toLocaleString()}</tspan>
                        <tspan x="${labelPos2.textX}" dy="16" class="label-pct">${(pct2 * 100).toFixed(0)}%</tspan>
                    </text>
                </svg>
            `;

            container.innerHTML = svg;
        }

        // --- Geometry Helpers ---

        _polarToCartesian(centerX, centerY, radius, angleInRadians) {
            return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
            };
        }

        _describeDonut(x, y, innerRadius, radius, startAngle, endAngle) {
            const startOuter = this._polarToCartesian(x, y, radius, endAngle);
            const endOuter = this._polarToCartesian(x, y, radius, startAngle);
            const startInner = this._polarToCartesian(x, y, innerRadius, endAngle);
            const endInner = this._polarToCartesian(x, y, innerRadius, startAngle);

            const arcSweep = endAngle - startAngle <= Math.PI ? "0" : "1";

            return [
                "M", startOuter.x, startOuter.y,
                "A", radius, radius, 0, arcSweep, 0, endOuter.x, endOuter.y,
                "L", endInner.x, endInner.y,
                "A", innerRadius, innerRadius, 0, arcSweep, 1, startInner.x, startInner.y,
                "Z"
            ].join(" ");
        }

        _getLabelPos(cx, cy, radius, startAngle, endAngle, isLeft) {
            // Find middle angle of the slice
            let midAngle = startAngle + (endAngle - startAngle) / 2;
            
            // 1. Point on the edge of the donut
            const p1 = this._polarToCartesian(cx, cy, radius, midAngle);
            
            // 2. Elbow point (pushed out by 20px)
            const p2 = this._polarToCartesian(cx, cy, radius + 20, midAngle);
            
            // 3. End point (Horizontal line)
            // If left side, go left. If right side, go right.
            const lineLen = 30;
            const p3x = isLeft ? p2.x - lineLen : p2.x + lineLen;
            const p3y = p2.y;

            return {
                linePoints: `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3x},${p3y}`,
                textX: isLeft ? p3x - 5 : p3x + 5,
                textY: p3y - 12 // Shift up slightly to center the text block relative to the line
            };
        }

        // Scripting Interface
        setAssetData(val1, val2) {
            this.onCustomWidgetBeforeUpdate({ val1: val1, val2: val2 });
            this.onCustomWidgetAfterUpdate({ val1: val1, val2: val2 });
        }
    }

    customElements.define("asset-donut-chart", AssetDonutChart);
    customElements.define("asset-donut-builder", AssetDonutBuilder);
})();