/**
 * ĐỒ ÁN THỰC HÀNH: TRỰC QUAN HÓA DỮ LIỆU THỜI TIẾT
 * KỸ THUẬT: D3.JS (V7)
 * CÁC TASK: 1 (Nhiệt độ theo thời gian), 5 (So sánh địa hình), 10 (Tương quan UV & Nhiệt độ)
 */

// 1. CẤU HÌNH KÍCH THƯỚC CHUNG
const margin = { top: 45, right: 60, bottom: 50, left: 60 };
const width = 650 - margin.left - margin.right;
const height = 300 - margin.top - margin.bottom;

let globalData = []; // Lưu trữ dữ liệu sau khi làm sạch
const tooltip = d3.select("#tooltip");

// 2. TẢI VÀ LÀM SẠCH DỮ LIỆU (DATA CLEANING)
d3.csv("clean_weather_dataset.csv").then(data => {
    const parseDate = d3.timeParse("%m/%d/%Y");

    data.forEach(d => {
        d.date = parseDate(d.date);
        d.temp = +d["day.avgtemp_c"];
        d.uv = +d["day.uv"];
        d.humidity = +d["day.avghumidity"];
        d.region = d["location.region"];
        d.terrain = d["location.terrain"] || "Khác";
    });

    // Loại bỏ dòng lỗi/thiếu dữ liệu quan trọng
    globalData = data.filter(d => d.date && !isNaN(d.temp) && d.region);

    // Khởi tạo Dropdown chọn vùng miền
    const regions = ["Tất cả các vùng", ...new Set(globalData.map(d => d.region))];
    d3.select("#regionSelect").selectAll("option")
        .data(regions).enter().append("option")
        .text(d => d).attr("value", d => d);

    // Vẽ dashboard lần đầu
    updateDashboard("Tất cả các vùng");

    // Lắng nghe sự kiện đổi bộ lọc
    d3.select("#regionSelect").on("change", function () {
        updateDashboard(this.value);
    });
});

// 3. HÀM CẬP NHẬT TOÀN BỘ DASHBOARD KHI FILTER
function updateDashboard(selectedRegion) {
    const filteredData = selectedRegion === "Tất cả các vùng"
        ? globalData
        : globalData.filter(d => d.region === selectedRegion);

    drawTask1(filteredData);
    drawTask5(filteredData);
    drawTask10(filteredData);
    
    // Reset bảng chi tiết
    d3.select("#detailContent").html("Click vào biểu đồ để xem chi tiết...");
}

// --- TASK 1: BIẾN THIÊN NHIỆT ĐỘ (MONTHLY LINE CHART + GRADIENT LEGEND) ---
function drawTask1(data) {
    const svg = d3.select("#task1").html("").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Thống kê nhiệt độ trung bình theo tháng
    const monthly = d3.rollups(data, v => d3.mean(v, d => d.temp), d => d.date.getMonth())
        .sort((a, b) => a[0] - b[0]);

    const x = d3.scaleLinear().domain([0, 11]).range([0, width]);
    
    // Tìm min/max thực tế của dữ liệu để dải màu biến đổi rõ rệt nhất
    const tempExtent = d3.extent(monthly, d => d[1]);
    const y = d3.scaleLinear().domain([tempExtent[0] - 2, tempExtent[1] + 2]).range([height, 0]);

    // Tạo thang đo màu để dùng cho cả Dot và Gradient
    const colorScale = d3.scaleLinear()
        .domain([tempExtent[0], tempExtent[1]]) // Thang đo từ nhiệt độ thấp nhất đến cao nhất
        .range(["#ffcc33", "#b30000"]); // Từ Vàng cam nhạt đến Đỏ đậm (Bold Red)

    // Định nghĩa Gradient cho đường kẻ
     const defs = svg.append("defs");

    // 1. Gradient cho đường kẻ (chạy dọc theo trục Y - Nhiệt độ)
    const tempGrad = defs.append("linearGradient")
        .attr("id", "temp-grad")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", "0%").attr("y1", y(tempExtent[0])) 
        .attr("x2", "0%").attr("y2", y(tempExtent[1]));
    tempGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ffcc33");
    tempGrad.append("stop").attr("offset", "100%").attr("stop-color", "#b30000");

    // 2. Gradient RIÊNG cho Chú thích (chạy ngang từ trái sang phải)
    const legendGrad = defs.append("linearGradient")
        .attr("id", "legend-grad")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%"); // Chạy ngang
    legendGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ffcc33");
    legendGrad.append("stop").attr("offset", "100%").attr("stop-color", "#b30000");

    // Vẽ Legend cho Task 1
    const legend = svg.append("g").attr("transform", `translate(${width - 150}, -25)`);
    legend.append("text").text("Mát").attr("class", "legend-text").attr("x", -30).attr("y", 9);
    
    // Sử dụng url(#legend-grad) thay vì temp-grad
    legend.append("rect")
        .attr("width", 100)
        .attr("height", 8)
        .attr("fill", "url(#legend-grad)") 
        .attr("rx", 4);
        
    legend.append("text").text("Nóng").attr("class", "legend-text").attr("x", 105).attr("y", 9);

    // Trục tọa độ
    const monthNames = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d => monthNames[d]));
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y));

    // Vẽ đường kẻ
    const line = d3.line().x(d => x(d[0])).y(d => y(d[1])).curve(d3.curveMonotoneX);
    const path = svg.append("path").datum(monthly)
        .attr("class", "line-temp")
        .attr("stroke", "url(#temp-grad)") // Áp dụng gradient
        .attr("stroke-width", 4)
        .attr("d", line);

    // Transition vẽ đường
    const totalLength = path.node().getTotalLength();
    path.attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition().duration(1500)
        .attr("stroke-dashoffset", 0);

    // Điểm nút tương tác
    svg.selectAll(".dot").data(monthly).enter().append("circle")
        .attr("cx", d => x(d[0]))
        .attr("cy", d => y(d[1]))
        .attr("r", 5)
        .attr("fill", d => colorScale(d[1])) // MÀU CỦA DOT THAY ĐỔI THEO NHIỆT ĐỘ
        .style("cursor", "pointer")
        .style("opacity", 0.9)
        .on("mouseover", function(e, d) {
            d3.select(this).transition().duration(200).attr("r", 8).style("opacity", 1);
            tooltip.style("opacity", 1).html(`Tháng ${d[0]+1}: <b>${d[1].toFixed(1)}°C</b>`);
        })
        .on("mousemove", (e) => tooltip.style("left", (e.pageX + 10) + "px").style("top", (e.pageY - 10) + "px"))
        .on("mouseout", function() {
            d3.select(this).transition().duration(200).attr("r", 5).style("opacity", 0.9);
            tooltip.style("opacity", 0);
        })
        .on("click", function(e, d) {
            d3.selectAll("circle").style("stroke", "none");
            d3.select(this).style("stroke", "white").style("stroke-width", 2);
            d3.select("#detailContent").html(`
                <p><b>Thời gian:</b> Tháng ${d[0] + 1}</p>
                <p><b>Nhiệt độ TB:</b> <span style="color:${colorScale(d[1])}; font-size:24px;"><b>${d[1].toFixed(2)}°C</b></span></p>
            `);
        });
}

// --- TASK 5: SO SÁNH ĐỊA HÌNH (SIDE-BY-SIDE BAR CHART + LEGEND) ---
function drawTask5(data) {
    const svg = d3.select("#task5").html("").append("svg")
        .attr("width", 350).attr("height", 250)
        .append("g").attr("transform", `translate(45,35)`);

    // Legend cho Task 5
    const legend = svg.append("g").attr("transform", "translate(100, -25)");
    legend.append("rect").attr("width", 10).attr("height", 10).attr("fill", "#f87171").attr("rx", 2);
    legend.append("text").text("Nhiệt độ").attr("x", 15).attr("y", 9).attr("class", "legend-text");
    legend.append("rect").attr("width", 10).attr("height", 10).attr("fill", "#60a5fa").attr("rx", 2).attr("x", 80);
    legend.append("text").text("Độ ẩm").attr("x", 95).attr("y", 9).attr("class", "legend-text");

    const stats = d3.rollups(data, v => ({ temp: d3.mean(v, d => d.temp), humid: d3.mean(v, d => d.humidity) }), d => d.terrain);
    const x0 = d3.scaleBand().domain(stats.map(d => d[0])).range([0, 280]).padding(0.2);
    const x1 = d3.scaleBand().domain(["temp", "humid"]).range([0, x0.bandwidth()]).padding(0.05);
    const y = d3.scaleLinear().domain([0, 100]).range([160, 0]);

    svg.append("g").attr("transform", "translate(0,160)").attr("class", "axis").call(d3.axisBottom(x0));
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5));

    const g = svg.selectAll(".terrain").data(stats).enter().append("g").attr("transform", d => `translate(${x0(d[0])},0)`);
    g.selectAll("rect").data(d => [{k:"temp", v:d[1].temp, t:d[0]}, {k:"humid", v:d[1].humid, t:d[0]}]).enter().append("rect")
        .attr("class", "bar").attr("x", d => x1(d.k)).attr("y", 160).attr("width", x1.bandwidth()).attr("height", 0)
        .attr("fill", d => d.k === "temp" ? "#f87171" : "#60a5fa")
        .on("click", function(e, d) {
            d3.selectAll(".bar").style("opacity", 0.3);
            d3.select(this).style("opacity", 1);
            d3.select("#detailContent").html(`
                <p><b>Địa hình:</b> ${d.t}</p>
                <p><b>${d.k === 'temp' ? 'Nhiệt độ' : 'Độ ẩm'} TB:</b> 
                <span style="color:${d.k==='temp'?'#f87171':'#60a5fa'}; font-size:20px;">
                ${d.v.toFixed(1)}${d.k === 'temp' ? '°C' : '%'}</span></p>
            `);
        })
        .transition().duration(1000).attr("y", d => y(d.v)).attr("height", d => 160 - y(d.v));
}

// --- TASK 10: TƯƠNG QUAN UV & NHIỆT ĐỘ (DUAL AXIS WEEKLY + LEGEND) ---
function drawTask10(data) {
    const svg = d3.select("#task10").html("").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // 1. CHÚ THÍCH (LEGEND) TRÊN CÙNG
    const legend = svg.append("g").attr("transform", `translate(${width/2 - 100}, -25)`);
    // Legend Nhiệt độ
    legend.append("line").attr("x1", 0).attr("x2", 20).attr("y1", 5).attr("y2", 5).attr("stroke", "#f87171").attr("stroke-width", 3);
    legend.append("text").text("Nhiệt độ (°C)").attr("x", 25).attr("y", 9).attr("class", "legend-text").style("fill", "#f87171");
    // Legend UV
    legend.append("line").attr("x1", 120).attr("x2", 140).attr("y1", 5).attr("y2", 5).attr("stroke", "#7dd3fc").attr("stroke-width", 3);
    legend.append("text").text("Chỉ số UV").attr("x", 145).attr("y", 9).attr("class", "legend-text").style("fill", "#7dd3fc");

    // Xử lý dữ liệu theo tuần
    const weekly = d3.rollups(data, 
        v => ({ temp: d3.mean(v, d => d.temp), uv: d3.mean(v, d => d.uv) }), 
        d => d3.timeWeek(d.date)
    ).sort((a,b) => a[0]-b[0]);

    const x = d3.scaleTime().domain(d3.extent(weekly, d => d[0])).range([0, width]);
    const yT = d3.scaleLinear().domain([10, 40]).range([height, 0]); // Trục trái
    const yU = d3.scaleLinear().domain([0, 12]).range([height, 0]);  // Trục phải

    // 2. THÊM LƯỚI NGANG (GRIDLINES)
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yT).ticks(5).tickSize(-width).tickFormat(""));

    // 3. VẼ CÁC TRỤC
    // Trục X - Định dạng Tháng/Năm
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(d3.timeMonth.every(2)).tickFormat(d3.timeFormat("%m/%Y")));

    // Trục tung bên trái (Nhiệt độ)
    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yT).ticks(5));
    
    // Nhãn trục trái
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("fill", "#f87171")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Nhiệt độ (°C)");

    // Trục tung bên phải (UV)
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(yU).ticks(6));

    // Nhãn trục phải
    svg.append("text")
        .attr("transform", "rotate(90)")
        .attr("y", -width - margin.right + 20)
        .attr("x", height / 2)
        .attr("text-anchor", "middle")
        .style("fill", "#7dd3fc")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Chỉ số UV");

    // 4. VẼ ĐƯỜNG BIỂU DIỄN
    const lineT = d3.line().x(d => x(d[0])).y(d => yT(d[1].temp)).curve(d3.curveMonotoneX);
    const lineU = d3.line().x(d => x(d[0])).y(d => yU(d[1].uv)).curve(d3.curveMonotoneX);

    svg.append("path").datum(weekly).attr("fill", "none").attr("stroke", "#f87171").attr("stroke-width", 3).attr("d", lineT);
    svg.append("path").datum(weekly).attr("fill", "none").attr("stroke", "#7dd3fc").attr("stroke-width", 3).attr("d", lineU);

    // 5. TƯƠNG TÁC (INTERACTION)
    const focus = svg.append("line").attr("stroke", "white").attr("stroke-dasharray", "3,3").attr("y1", 0).attr("y2", height).style("opacity", 0);

    svg.append("rect").attr("width", width).attr("height", height).style("fill", "none").style("pointer-events", "all")
        .on("mouseover", () => { focus.style("opacity", 1); tooltip.style("opacity", 1); })
        .on("mouseout", () => { focus.style("opacity", 0); tooltip.style("opacity", 0); })
        .on("mousemove", (e) => {
            const x0 = x.invert(d3.pointer(e)[0]);
            const i = d3.bisector(d => d[0]).left(weekly, x0, 1);
            const d = weekly[i-1];
            if(d) {
                focus.attr("x1", x(d[0])).attr("x2", x(d[0]));
                tooltip.html(`<b>Tuần: ${d3.timeFormat("%d/%m/%Y")(d[0])}</b><br>
                              <span style="color:#f87171">Nhiệt độ: ${d[1].temp.toFixed(1)}°C</span><br>
                              <span style="color:#7dd3fc">Chỉ số UV: ${d[1].uv.toFixed(1)}</span>`)
                       .style("left", (e.pageX+15)+"px").style("top", (e.pageY-15)+"px");
            }
        })
        .on("click", (e) => {
            const x0 = x.invert(d3.pointer(e)[0]);
            const i = d3.bisector(d => d[0]).left(weekly, x0, 1);
            const d = weekly[i-1];
            if(d) d3.select("#detailContent").html(`
                <h4 style="margin-bottom:10px; color:#7dd3fc">Chi tiết tuần ${d3.timeFormat("%d/%m/%Y")(d[0])}</h4>
                <p>🌡️ <b>Nhiệt độ TB:</b> <span style="color:#f87171">${d[1].temp.toFixed(2)}°C</span></p>
                <p>☀️ <b>Chỉ số UV TB:</b> <span style="color:#7dd3fc">${d[1].uv.toFixed(2)}</span></p>
                <p style="margin-top:10px; font-size:12px; color:#aaa"><i>Dữ liệu được tính toán trung bình theo tuần từ bộ lọc hiện tại.</i></p>
            `);
        });
}