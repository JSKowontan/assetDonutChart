(function() {
    "use strict";

    // =================================================================================
    // PART 1: BUILDER PANEL
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
            .section { background: white; padding: 10px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 15px; }
            h3 { margin: 0 0 10px 0; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-size: 12px; font-weight: bold; color: #333; }
            input { width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 13px; }
            input[type="color"] { height: 35px; cursor: pointer; }
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
                <h3>Segment 1 (Liabilities)</h3>
                <div class="form-group"><label>Label</label><input type="text" id="label1" value="Liabilities"></div>
                <div class="form-group"><label>Color</label><input type="color" id="color1" value="#ed8b36"></div>
            </div>

            <div class="section">
                <h3>Segment 2 (Equities)</h3>
                <div class="form-group"><label>Label</label><input type="text" id="label2" value="Equities"></div>
                <div class="form-group"><label>Color</label><input type="color" id="color2" value="#4472c4"></div>
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
                        color1: this.color1,
                        label2: this.label2,
                        color2: this.color2
                    }
                }
            }));
        }

        get chartTitle() { return this.shadowRoot.getElementById("chartTitle").value; }
        get centerLabel() { return this.shadowRoot.getElementById("centerLabel").value; }
        get label1() { return this.shadowRoot.getElementById("label1").value; }
        get color1() { return this.shadowRoot.getElementById("color1").value; }
        get label2() { return this.shadowRoot.getElementById("label2").value; }
        get color2() { return this.shadowRoot.getElementById("color2").value; }
    }

    // =================================================================================
    // PART 2: MAIN WIDGET
    // =================================================================================

    const widgetTemplate = document.createElement("template");
    widgetTemplate.innerHTML = `
        <style>
            :host { display: block; width: 100%; height: 100%; font-family: "72", Arial, sans-serif; }
            .container { width: 100%; height: 100%; position: relative; }
            
            .no-data {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                color: #999; font-size: 14px; font-style: italic;
            }

            /* SVG Text Styles */
            .chart-title { font-size: 18px; font-weight: bold; fill: #444; }
            .center-label { font-size: 14px; fill: #555; }
            .center-value { font-size: 18px; font-weight: bold; fill: #333; }
            
            .label-text { font-size: 12px; fill: #666; }
            .label-val { font-size: 14px; font-weight: bold; fill: #333; }
            .label-pct { font-size: 12px; fill: #888; }
            
            /* Donut Segments (Strokes) */
            path.segment { 
                fill: none; 
                stroke-width: 12; /* Controls Thickness */
                stroke-linecap: round; /* Modern Round Edges */
                transition: stroke-width 0.3s, opacity 0.3s; 
                cursor: pointer; 
            }
            path.segment:hover { 
                stroke-width: 16; /* Pop effect */
                opacity: 0.9; 
            }
            
            polyline { fill: none; stroke: #bbb; stroke-width: 1; }

            /* Tooltip */
            #tooltip {
                position: fixed;
                background: rgba(255, 255, 255, 0.98);
                color: #333;
                padding: 10px;
                border-radius: 6px;
                font-size: 12px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 9999;
                box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                border: 1px solid #eee;
                min-width: 150px;
            }
            #tooltip h4 { margin: 0 0 5px 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; font-size: 13px; color: #0a6ed1; }
            .tt-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .tt-label { color: #666; margin-right: 10px; }
            .tt-val { font-weight: bold; }
        </style>
        
        <div class="container" id="chartContainer">
            <div id="tooltip"></div>
            <!-- SVG injected here -->
        </div>
    `;

    class AssetDonutChart extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: "open" });
            this.shadowRoot.appendChild(widgetTemplate.content.cloneNode(true));
            
            this._props = {
                chartTitle: "Asset Breakdown",
                centerLabel: "Asset",
                label1: "Liabilities", color1: "#ed8b36",
                label2: "Equities", color2: "#4472c4",
                
                // Data State
                val1: null, 
                val2: null,
                currency: "",
                unit: "",
                tooltipData: [] // Stores breakdown info
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

            // 1. Check for Data
            if (p.val1 === null || p.val2 === null) {
                container.innerHTML = `<div class="no-data">No Data Available</div>`;
                return;
            }

            // 2. Calculations
            const total = p.val1 + p.val2;
            const pct1 = total ? (p.val1 / total) : 0;
            const pct2 = total ? (p.val2 / total) : 0;

            const width = container.clientWidth || 300;
            const height = container.clientHeight || 300;
            const cx = width / 2;
            const cy = height / 2 + 10;
            
            // Modern UI: Thinner Ring
            // We use stroke, so radius is the center of the line
            const radius = Math.min(width, height) / 3.2; 
            
            // Angles
            // Gap logic: subtract a tiny bit from angles
            const gap = 0.15; // Radians gap
            
            // Slice 1: Liabilities (Left side, typically 12 o'clock going counter-clockwise in visualization, 
            // but SVG goes clockwise. Let's make Liabilities orange on the left.)
            // Start at -90deg (top). Go back by angle1.
            const angle1 = pct1 * 2 * Math.PI;
            const angle2 = pct2 * 2 * Math.PI;

            // Start angles for SVG arcs
            // To mimic the image: 
            // Orange (Liab) starts top-left (-90deg minus angle1) to top (-90deg)
            // Blue (Eq) starts top (-90deg) to bottom-right (-90deg plus angle2)
            
            const startAngle1 = (-Math.PI / 2) - angle1 + (gap/2); 
            const endAngle1 = (-Math.PI / 2) - (gap/2);
            
            const startAngle2 = (-Math.PI / 2) + (gap/2);
            const endAngle2 = (-Math.PI / 2) + angle2 - (gap/2);

            // Generate Path Strings
            const d1 = this._describeArc(cx, cy, radius, startAngle1, endAngle1);
            const d2 = this._describeArc(cx, cy, radius, startAngle2, endAngle2);

            // 3. Leader Lines
            // Logic: Longer first part (radial), Fixed short second part (horizontal)
            const labelPos1 = this._getLeaderLine(cx, cy, radius, startAngle1, endAngle1, true);
            const labelPos2 = this._getLeaderLine(cx, cy, radius, startAngle2, endAngle2, false);

            const svg = `
                <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                    <text x="10" y="25" class="chart-title">${p.chartTitle}</text>

                    <!-- Slices -->
                    <path d="${d1}" class="segment" stroke="${p.color1}" id="seg1" />
                    <path d="${d2}" class="segment" stroke="${p.color2}" id="seg2" />

                    <!-- Center Text -->
                    <text x="${cx}" y="${cy - 5}" text-anchor="middle" class="center-label">${p.centerLabel}</text>
                    <text x="${cx}" y="${cy + 20}" text-anchor="middle" class="center-value">${p.currency}${total.toLocaleString()}${p.unit}</text>

                    <!-- Label 1 (Left) -->
                    <polyline points="${labelPos1.points}" />
                    <text x="${labelPos1.tx}" y="${labelPos1.ty}" text-anchor="end">
                        <tspan x="${labelPos1.tx}" dy="0" class="label-text">${p.label1}</tspan>
                        <tspan x="${labelPos1.tx}" dy="16" class="label-val">${p.currency}${p.val1.toLocaleString()}${p.unit}</tspan>
                        <tspan x="${labelPos1.tx}" dy="14" class="label-pct">${(pct1 * 100).toFixed(0)}%</tspan>
                    </text>

                    <!-- Label 2 (Right) -->
                    <polyline points="${labelPos2.points}" />
                    <text x="${labelPos2.tx}" y="${labelPos2.ty}" text-anchor="start">
                        <tspan x="${labelPos2.tx}" dy="0" class="label-text">${p.label2}</tspan>
                        <tspan x="${labelPos2.tx}" dy="16" class="label-val">${p.currency}${p.val2.toLocaleString()}${p.unit}</tspan>
                        <tspan x="${labelPos2.tx}" dy="14" class="label-pct">${(pct2 * 100).toFixed(0)}%</tspan>
                    </text>
                </svg>
                <div id="tooltip"></div>
            `;

            container.innerHTML = svg;
            this._addInteractivity();
        }

        // --- Geometry for Stroked Paths (Rounded) ---
        _polarToCartesian(cx, cy, radius, angleInRadians) {
            return {
                x: cx + (radius * Math.cos(angleInRadians)),
                y: cy + (radius * Math.sin(angleInRadians))
            };
        }

        _describeArc(x, y, radius, startAngle, endAngle) {
            const start = this._polarToCartesian(x, y, radius, endAngle);
            const end = this._polarToCartesian(x, y, radius, startAngle);
            const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

            // Standard SVG Arc command
            return [
                "M", start.x, start.y, 
                "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
            ].join(" ");
        }

        _getLeaderLine(cx, cy, radius, startAngle, endAngle, isLeft) {
            const midAngle = startAngle + (endAngle - startAngle) / 2;
            
            // 1. Start at donut edge (plus gap for styling)
            const p1 = this._polarToCartesian(cx, cy, radius + 10, midAngle);
            
            // 2. Elbow point (Longer radial part)
            const radialLen = 35;
            const p2 = this._polarToCartesian(cx, cy, radius + radialLen, midAngle);
            
            // 3. End point (Fixed short horizontal elbow)
            const elbowLen = 15;
            const p3x = isLeft ? p2.x - elbowLen : p2.x + elbowLen;
            const p3y = p2.y;

            return {
                points: `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3x},${p3y}`,
                tx: isLeft ? p3x - 5 : p3x + 5,
                ty: p3y - 15
            };
        }

        // --- Tooltip Logic ---
        _addInteractivity() {
            const tooltip = this.shadowRoot.getElementById("tooltip");
            const seg1 = this.shadowRoot.getElementById("seg1");
            const seg2 = this.shadowRoot.getElementById("seg2");
            const p = this._props;

            const handleHover = (segmentName, e) => {
                const data = p.tooltipData.filter(d => d.group === segmentName);
                let html = `<h4>${segmentName} Breakdown</h4>`;
                
                if (data.length === 0) {
                    html += `<div style="color:#999;font-style:italic">No details available</div>`;
                } else {
                    data.forEach(item => {
                        html += `
                        <div class="tt-row">
                            <span class="tt-label">${item.label}</span>
                            <span class="tt-val">${item.currency || ""}${item.value.toLocaleString()}${item.unit || ""}</span>
                        </div>`;
                    });
                }
                
                tooltip.innerHTML = html;
                tooltip.style.opacity = 1;
            };

            const moveTooltip = (e) => {
                tooltip.style.left = (e.clientX + 15) + "px";
                tooltip.style.top = (e.clientY + 15) + "px";
            };

            const hideTooltip = () => { tooltip.style.opacity = 0; };

            if(seg1) {
                seg1.addEventListener("mouseenter", (e) => handleHover(p.label1, e));
                seg1.addEventListener("mousemove", moveTooltip);
                seg1.addEventListener("mouseleave", hideTooltip);
            }
            if(seg2) {
                seg2.addEventListener("mouseenter", (e) => handleHover(p.label2, e));
                seg2.addEventListener("mousemove", moveTooltip);
                seg2.addEventListener("mouseleave", hideTooltip);
            }
        }

        // --- Scripting Methods ---
        
        // Updated to accept currency and unit
        setAssetData(val1, val2, currencySymbol, valueUnit) {
            this.onCustomWidgetBeforeUpdate({ 
                val1: val1, 
                val2: val2,
                currency: currencySymbol || "",
                unit: valueUnit || ""
            });
            this.onCustomWidgetAfterUpdate({ 
                val1: val1, 
                val2: val2,
                currency: currencySymbol || "",
                unit: valueUnit || ""
            });
        }

        // New Method for Tooltips
        setTooltipData(jsonString) {
            try {
                const data = JSON.parse(jsonString);
                this.onCustomWidgetBeforeUpdate({ tooltipData: data });
                this.onCustomWidgetAfterUpdate({ tooltipData: data });
            } catch(e) { console.error("Invalid Tooltip JSON"); }
        }
    }

    customElements.define("asset-donut-chart", AssetDonutChart);
    customElements.define("asset-donut-builder", AssetDonutBuilder);
})();
