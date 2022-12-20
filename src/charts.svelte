<!-- 
Here are the points we discussed:

    1) Should be able to display X-axis in two style:
       - X-axis should be a linear axis
       - X-axis should be a time-series

    2) Zoom + pan

        - Should be able to wheel-scroll on X axis or Y axis, to zoom only that specific axis.
        - Should be able to wheel-scroll on the plot-area, to zoom both axes together.

        - Double-click on plot-area to reset to default extent.

        - When the chart is panned-backwards (meaning, zoomed/panned so that the latest bar is not shown),
          and new data arrives from the websocket:

            - New data should be added to the `this.klines` array
            - X and Y scales' domains should be updated
            - the current zoom and view should not change.
 -->

<script type="js">
    import * as d3 from "d3"
    import * as fc from "d3fc"

    export let currentSymbol = "BTCUSDT"

    let websocket
    let charts = {}

    let range_powers = []
    for (let i = 0; i < 24; i++) {
        range_powers.push(i)
    }
    
    // const URL = `ws://${location.hostname}:8000/chart/chart-ohlcv`
    const URL = `ws://157.90.203.106:8000/chart/chart-ohlcv`

    class Chart {
        constructor(range_pow, klines) {
            this.range_pow = range_pow
            this.range_val = Math.pow(2, range_pow)
            this.selector = `.container_${this.range_pow}`
            this.chartLabel = `R${range_pow} ${this.range_val}`

            this.xScale = d3.scaleTime()
            this.yScale = d3.scaleLinear()

            this.klines = klines

            this.xExtent = fc.extentTime().accessors([(d) => new Date(d.t)])
            this.yExtent = fc.extentLinear().accessors([(d) => d.h, (d) => d.l])

            this.gridlines = fc.annotationCanvasGridline()
            this.candles = fc
                // .autoBandwidth(fc.seriesCanvasCandlestick())
                // .widthFraction(0.7)
                .seriesCanvasCandlestick()
                .crossValue((d) => new Date(d.t))
                .openValue((d) => d.o)
                .highValue((d) => d.h)
                .lowValue((d) => d.l)
                .closeValue((d) => d.c)
            
            this.multi = fc.seriesCanvasMulti()
                .series([this.gridlines, this.candles])
                .mapping((data, index, series) => {
                    switch (series[index]) {
                        case this.gridlines:
                            return data
                        case this.candles:
                            return data
                    }
                })
            this.chart = fc
                .chartCartesian({xScale: this.xScale, yScale: this.yScale})
                .chartLabel(this.chartLabel)
                .yDomain(this.yExtent(this.klines))
                .xDomain(this.xExtent(this.klines))
                .canvasPlotArea(this.multi)
                .decorate(sel => {
                    sel.enter()
                        .selectAll(".plot-area")
                        .call(this.zoom, this.xScale, this.yScale)
                    sel.enter()
                        .selectAll(".x-axis")
                        .call(this.zoom, this.xScale, null)
                    sel.enter()
                        .selectAll(".y-axis")
                        .call(this.zoom, null, this.yScale)
                })

            this.zoom = fc.zoom().on("zoom", () => this.render())
        }

        set klines(value) {
            this._klines = value
            this.xScale.domain([0, value.length])
                .range([0, this.w])

            let ymin = d3.min(value.map(d => d.l))
            let ymax = d3.max(value.map(d => d.h))
            this.yScale.domain([ymin, ymax])
                .range([this.h, 0]).nice()
        }

        get klines() {
            return this._klines
        }

        show() {
            d3.select(this.selector)
                .style("display", "inline-block")
        }

        hide() {
            d3.select(this.selector)
                .style("display", "none")
        }

        render() {
            d3.select(this.selector)
                .datum(this.klines)
                .call(this.chart)
            this.show()
        }

        get w() {
            let node = d3.select(this.selector).nodes()[0]
            let style = window.getComputedStyle(node)
            return parseInt(style.width)
        }

        get h() {
            let node = d3.select(this.selector).nodes()[0]
            let style = window.getComputedStyle(node)
            return parseInt(style.height)
        }
    }

    const startWebsocket = async (symbol) => {
        if (websocket) {
            websocket.close()
        }
        websocket = new WebSocket(URL)
        websocket.onopen = (event) => {
            websocket.send(JSON.stringify({symbol: currentSymbol}))
        }
        websocket.onclose = () => {
            Object.values(charts).forEach(chart => chart.hide())
        }
        websocket.onmessage = (event) => {
            let json = JSON.parse(event.data)
            Object.keys(json).forEach(range_pow => {
                if (!charts[range_pow]) {
                    charts[range_pow] = new Chart(range_pow, json[range_pow])
                } else {
                    charts[range_pow].klines = [...charts[range_pow].klines, ...json[range_pow]].slice(-2000)
                }
                charts[range_pow].render()
            })
        }
    }

    $: startWebsocket(currentSymbol)

</script>

<section>
    {#each range_powers.reverse() as range_pow}
        <div class="container container_{range_pow}" />
    {/each}
</section>

<style>
    section {
        min-width: 100%;
        width: 100%;
        height: 100%;
        min-height: 100%;
        margin: 0;
        padding: 0;
    }

    div.container {
        width: 33.33%;
        min-width: 33.33%;
        max-width: 33.33%;
        height: 33.33%;
        min-height: 33.33%;
        max-height: 33.33%;
        margin: 0;
        padding: 0;
        display: none;
    }
</style>
