// Cấu hình kích thước chung
const margin = {top: 50, right: 80, bottom: 60, left: 60};
const width = 1000 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const tooltip = d3.select("#tooltip");

// 1. LOAD VÀ XỬ LÝ DỮ LIỆU
d3.csv("clean_weather_dataset.csv").then(data => {
    const parseDate = d3.timeParse("%m/%d/%Y");

    data.forEach(d => {
        d.date = parseDate(d.date);
        d.avgtemp = +d["day.avgtemp_c"];
        d.humidity = +d["day.avghumidity"];
        d.uv = +d["day.uv"];
        d.terrain = d["location.terrain"] || "Khác";
    });

    // Lọc bỏ dữ liệu trống
    const cleanData = data.filter(d => d.date && !isNaN(d.avgtemp));

    // Gọi các hàm vẽ
    renderTask1(cleanData);
    renderTask5(cleanData);
    renderTask10(cleanData);
});

// --- TASK 1: LINE CHART VỚI GRADIENT ---
function renderTask1(data) {
    const svg = d3.select("#task1").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Nhóm dữ liệu theo tháng
    const monthlyData = d3.rollups(data, 
        v => d3.mean(v, d => d.avgtemp), 
        d => d.date.getMonth()
    ).sort((a, b) => a[0] - b[0]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const x = d3.scaleLinear().domain([0, 11]).range([0, width]);
    const y = d3.scaleLinear().domain([18, d3.max(monthlyData, d => d[1]) + 2]).range([height, 0]);

    // Tạo Gradient cho đường (Nhiệt độ cao = Đỏ đậm)
    svg.append("linearGradient")
        .attr("id", "line-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", y(20))
        .attr("x2", 0).attr("y2", y(30))
        .selectAll("stop")
        .data([
            {offset: "0%", color: "#ffcccc"}, // Nhiệt độ thấp - Hồng nhạt
            {offset: "100%", color: "#b30000"} // Nhiệt độ cao - Đỏ đậm
        ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    svg.append("g").attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(i => monthNames[i]));
    svg.append("g").call(d3.axisLeft(y));

    const line = d3.line().x(d => x(d[0])).y(d => y(d[1])).curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(monthlyData)
        .attr("class", "line")
        .attr("stroke", "url(#line-gradient)")
        .attr("d", line);

    // Điểm nút và Interaction
    svg.selectAll(".dot").data(monthlyData).enter().append("circle")
        .attr("cx", d => x(d[0])).attr("cy", d => y(d[1])).attr("r", 6)
        .attr("fill", d => d[1] > 25 ? "#b30000" : "#ff9999")
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1).html(`<b>Tháng ${d[0]+1}</b><br>Nhiệt độ: ${d[1].toFixed(2)}°C`);
            d3.select(event.currentTarget).attr("r", 10);
        })
        .on("mousemove", e => tooltip.style("left", (e.pageX+15)+"px").style("top", (e.pageY-15)+"px"))
        .on("mouseout", (event) => {
            tooltip.style("opacity", 0);
            d3.select(event.currentTarget).attr("r", 6);
        });
}

// --- TASK 5: GROUPED BAR CHART (HOVER CHI TIẾT) ---
function renderTask5(data) {
    const svg = d3.select("#task5").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const terrainStats = d3.rollups(data, 
        v => ({ temp: d3.mean(v, d => d.avgtemp), humid: d3.mean(v, d => d.humidity) }),
        d => d.terrain
    );

    const keys = ["temp", "humid"];
    const x0 = d3.scaleBand().domain(terrainStats.map(d => d[0])).rangeRound([0, width]).paddingInner(0.2);
    const x1 = d3.scaleBand().domain(keys).rangeRound([0, x0.bandwidth()]).padding(0.05);
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);
    const color = d3.scaleOrdinal().domain(keys).range(["#e67e22", "#3498db"]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x0));
    svg.append("g").call(d3.axisLeft(y));

    const g = svg.selectAll(".terrain-group").data(terrainStats).enter().append("g")
        .attr("transform", d => `translate(${x0(d[0])},0)`);

    g.selectAll("rect").data(d => keys.map(key => ({key, value: d[1][key], terrain: d[0]})))
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x1(d.key))
        .attr("y", height)
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("fill", d => color(d.key))
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`<b>Địa hình: ${d.terrain}</b><br>${d.key === 'temp' ? 'Nhiệt độ' : 'Độ ẩm'}: <b>${d.value.toFixed(1)}${d.key === 'temp' ? '°C' : '%'}</b>`);
        })
        .on("mousemove", e => tooltip.style("left", (e.pageX+15)+"px").style("top", (e.pageY-15)+"px"))
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition().duration(1000)
        .attr("y", d => y(d.value))
        .attr("height", d => height - y(d.value));
}

// --- TASK 10: DUAL AXIS LINE CHART (GIỐNG TABLEAU) ---
function renderTask10(data) {
    const svg = d3.select("#task10").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Gom nhóm dữ liệu theo tuần để đường mượt hơn (giống Weekly trong Tableau)
    const weeklyData = d3.rollups(data, 
        v => ({ temp: d3.mean(v, d => d.avgtemp), uv: d3.mean(v, d => d.uv) }),
        d => d3.timeWeek(d.date)
    ).sort((a, b) => a[0] - b[0]);

    const x = d3.scaleTime().domain(d3.extent(weeklyData, d => d[0])).range([0, width]);
    const yTemp = d3.scaleLinear().domain([15, 35]).range([height, 0]); // Trục trái cho Nhiệt độ
    const yUV = d3.scaleLinear().domain([0, 12]).range([height, 0]);    // Trục phải cho UV

    // Vẽ trục
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(yTemp).ticks(5)).append("text")
        .attr("class", "axis-label").attr("y", -10).attr("x", -10).text("Nhiệt độ (°C)");
    
    svg.append("g").attr("transform", `translate(${width}, 0)`).call(d3.axisRight(yUV).ticks(5))
        .append("text").attr("class", "axis-label").attr("y", -10).attr("x", 40).style("text-anchor", "end").text("Chỉ số UV");

    // Đường Nhiệt độ (Màu đỏ)
    const lineTemp = d3.line().x(d => x(d[0])).y(d => yTemp(d[1].temp)).curve(d3.curveMonotoneX);
    svg.append("path").datum(weeklyData).attr("class", "line").attr("stroke", "#e74c3c").attr("d", lineTemp);

    // Đường UV (Màu xanh)
    const lineUV = d3.line().x(d => x(d[0])).y(d => yUV(d[1].uv)).curve(d3.curveMonotoneX);
    svg.append("path").datum(weeklyData).attr("class", "line").attr("stroke", "#3498db").attr("d", lineUV);

    // Interaction Overlay (Vertical Line)
    const focus = svg.append("line").attr("stroke", "#999").attr("stroke-dasharray", "3,3").attr("y1", 0).attr("y2", height).style("opacity", 0);

    svg.append("rect").attr("width", width).attr("height", height).style("fill", "none").style("pointer-events", "all")
        .on("mouseover", () => { focus.style("opacity", 1); tooltip.style("opacity", 1); })
        .on("mouseout", () => { focus.style("opacity", 0); tooltip.style("opacity", 0); })
        .on("mousemove", (event) => {
            const bisect = d3.bisector(d => d[0]).left;
            const x0 = x.invert(d3.pointer(event)[0]);
            const i = bisect(weeklyData, x0, 1);
            const d = weeklyData[i-1];
            
            focus.attr("x1", x(d[0])).attr("x2", x(d[0]));
            tooltip.html(`<b>Tuần: ${d3.timeFormat("%d/%m/%Y")(d[0])}</b><br>
                          <span style="color:#e74c3c">Nhiệt độ: ${d[1].temp.toFixed(1)}°C</span><br>
                          <span style="color:#3498db">Chỉ số UV: ${d[1].uv.toFixed(1)}</span>`)
                   .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
        });
}