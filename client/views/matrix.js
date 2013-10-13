Template.matrix.dataReady = function() {
    NProgress.inc();
    return allpeopleSub.ready();
}

// Utility Functions
var aggregate = function (obj, values, context) {
    if (!values.length)
       return obj;
    var byFirst = _.groupBy(obj, values[0], context),
    rest = values.slice(1);
    for (var prop in byFirst) {
        byFirst[prop] = aggregate(byFirst[prop], rest, context);
    }
    return byFirst;
};
// Aggregate to bottom level, then sum
var aggregateCounts = function (obj, values, context) {
    if (!values.length)
        return obj.length;
    var byFirst = _.groupBy(obj, values[0], context),
    rest = values.slice(1);
    for (var prop in byFirst) {
        byFirst[prop] = aggregateCounts(byFirst[prop], rest, context);
    }
    return byFirst;
};

String.prototype.capitalize = function() {
    // Match letters at beginning of string or after white space character
    return this.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};

// TODO Pull this out of here
var matrixProps = {
    width: 660
        , height: 2000
        , headerHeight: 155
        , margin: {
            top: 10
            , right: 10
            , bottom: 5
            , left: 30
        }
    }
Template.matrix_svg.properties = {
    headerHeight: matrixProps.headerHeight
    , fullWidth: matrixProps.width + matrixProps.margin.left + matrixProps.margin.right
    , fullHeight: matrixProps.height + matrixProps.margin.top + matrixProps.margin.bottom
}


Template.matrix_svg.rendered = function() {

    var context = this;
    if ( this.rendered ) return;
    this.rendered = true;

    // Visualization width (NOT SVG width)
    matrixProps.fullWidth = $('.page-middle').width();
    matrixProps.width = matrixProps.fullWidth - matrixProps.margin.left - matrixProps.margin.right;


    var fill = d3.scale.linear()
        .domain([0, 1])
        .range(["#f1e7d0", "red"]);

    var matrixScales = {
        x: d3.scale.ordinal().rangeBands([0, matrixProps.height])
        , y: d3.scale.ordinal().rangeBands([0, matrixProps.width])
        , z: d3.scale.linear().domain([0, 1]).clamp(true)
        , c: d3.scale.category10().domain(d3.range(10)) 
    }

    /* Reactive data! */
    var data = People.find().fetch();

    /* Session variables changing view to same data */
    var gender = Session.get('gender');
    var countryOrder_var = Session.get('countryOrder');
    var industryOrder_var = Session.get('industryOrder');

    /* SVG Handles */
    var svg = d3.select(this.find("svg.matrix"))
        .attr("width", matrixProps.fullWidth)
        .append("g")
        .attr("transform", "translate(" + matrixProps.margin.left + "," + 0 + ")");

    var header_svg = d3.select(this.find("svg.header"))
        .attr("width", matrixProps.fullWidth)
        .append("g")
        .attr("transform", "translate(" + matrixProps.margin.left + "," + matrixProps.headerHeight + ")");

    /* Initializing Data Containers */
    var matrix = [];  // matrix mapping countries to industries
    var inv_matrix = [];  // matrix mapping industries to countries
    var industries = []; // entities on x-axis (list of industries)
    var countries = [];  // entities on y-axis (list of countries)
    var links = [];  // list of {industry, country, value}
    var min_values = {};  // keyed by country
    var max_values = {};  // keyed by country
    var fills = {};  // keyed by country
    var country_counts = {};
    var industry_counts = {};

    var input = aggregateCounts(data, ['countryCode', 'industry', 'gender']);
    var grouped_individuals = aggregate(data, ['countryCode', 'industry']);


    for (var countryCode in input) {
        for (var industry in input[countryCode]) {
            var f_res = (!isNaN(input[countryCode][industry]['Female'])) ? input[countryCode][industry]['Female'] : 0;
            var m_res = (!isNaN(input[countryCode][industry]['Male'])) ? input[countryCode][industry]['Male'] : 0;
            var results = {
                'both': f_res + m_res,
                'male': m_res,
                'female': f_res,
                'ratio': ((f_res / m_res) == Number.POSITIVE_INFINITY) ? 1 : f_res / m_res
            };

            var value = results[gender];

            links.push({
                "country": countryCode,
                "industry": industry,
                "value": value
            });

            if (industries.indexOf(industry) == -1)
                industries.push(industry);

            if (countries.indexOf(countryCode) == -1) {
                countries.push(countryCode);
                min_values[countryCode] = Number.MAX_VALUE;
                max_values[countryCode] = Number.MIN_VALUE;
            }

            if (value < min_values[countryCode])
                min_values[countryCode] = value;
            else if (value > max_values[countryCode])
                max_values[countryCode] = value;

        }
    }

    var country_count = countries.length;
    var industry_count = industries.length;

    // Populate matrix
    countries.forEach(function(country, i) {
       country_counts[i] = 0;
       matrix[i] = d3.range(industry_count).map(function(j) {return {x: j, y: i, z: 0}; });
    });

    // Populate inverted matrix
    industries.forEach(function(industry, i) {
       industry_counts[i] = 0;
       inv_matrix[i] = d3.range(country_count).map(function(j) {return {x: i, y: j, z: 0}; });
    });


    // Convert links to matrix.
    links.forEach(function(link) {
        var country = link["country"];
        var industry = link["industry"];
        var country_index = countries.indexOf(country);
        var industry_index = industries.indexOf(industry);
        var value = link["value"] / max_values[country];
 
        if (max_values[country] === Number.MIN_VALUE) {
        }
 
        country_counts[country_index] += 1;
        industry_counts[industry_index] += 1;
 
        matrix[country_index][industry_index].z += value;
        inv_matrix[industry_index][country_index].z += value;
    });

    // Precompute ordering
    var countryOrders = {
        name: d3.range(country_count).sort(function(a, b) { return d3.ascending(countries[a], countries[b]); }),
        count: d3.range(country_count).sort(function(a, b) { return d3.ascending(country_counts[b], country_counts[a]); })
    };

    var industryOrders = {
        name: d3.range(industry_count).sort(function(a, b) { return d3.ascending(industries[a], industries[b]); }),
        count: d3.range(industry_count).sort(function(a, b) { return d3.descending(industry_counts[a], industry_counts[b]); })
    };

    // Default sort orders
    matrixScales.x.domain(countryOrders[countryOrder_var]);
    matrixScales.y.domain(industryOrders[industryOrder_var]);

    // Rows
    function updateRows(matrix) {
        // DATA JOIN
        var row = svg.selectAll(".row")
        .data(matrix, function(d, i) { return countries[i]; });

        // ENTER
        // Create new row elements as needed
        row.enter()
        .append("g")
        .attr("class", "row")
        .attr("transform", function(d, i) { return "translate(0," + matrixScales.x(i) + ")"; });
        
        row.append("line")
        .attr("x2", matrixProps.width);
        
        row.append("text")
        .attr("class", "row-title")
        .attr("x", -6)
        .attr("y", matrixScales.x.rangeBand() / 2)
        .attr("dy", ".32em")
        .attr("text-anchor", "end")
        .attr("font-family", "Lato")
        .attr("font-size", "0.8em")
        .text(function(d, i) { return countries[i]; });

        // ENTER + UPDATE

        // EXIT
        row.exit().remove();
    }
    
    updateRows(matrix);   

    function updateColumns(inv_matrix){
        // Columns
        var column = svg.selectAll(".column")
        .data(inv_matrix)
        .enter().append("g")
        .attr("class", "column")
        .attr("transform", function(d, i) { return "translate(" + matrixScales.y(i) + ")rotate(-90)"; })
        .each(column);

        var columnTitles = header_svg.selectAll(".column-title")
        .data(inv_matrix)

        columnTitles.enter()
        .append("text")
        .attr("class", "column-title")
        .attr("transform", function(d, i) { return "translate(" + matrixScales.y(i) + ")rotate(-90)"; })
        .attr("x", 6)
        .attr("y", matrixScales.y.rangeBand()/ 2)
        .attr("dy", ".32em")
        .attr("text-anchor", "start")
        .attr("font-family", "Lato")
        .attr("font-size", "1.2em")
        .attr("font-weight", 400)
        .text(function(d, i) { return industries[i].capitalize(); });

        // Cells
        function column(column) {
            var cell = d3.select(this).selectAll(".cell")
            .data(column.filter(function(d) { return d.z; }))
            .enter().append("rect")
            .attr("class", "cell")
            .attr("x", function(d) { return -matrixScales.x(d.y) - matrixScales.x.rangeBand(); })
            .attr("width", (Math.round(matrixScales.x.rangeBand()*10)/10) - 0.1)
            .attr("height", (Math.round(matrixScales.y.rangeBand()*10)/10) - 0.5)
            .style("fill", function(d) { return fill(d.z); })
            .on("mousemove", mouseover)
            .on("mouseout", mouseout);
        }
    }

    updateColumns(inv_matrix);

    function mouseover(p) {
        d3.selectAll(".row text").classed("active", function(d, i) { return i == p.y; });
        d3.selectAll(".column-title").classed("active", function(d, i) { return i == p.x; });

        var country_code = countries[p.y];
        var industry = industries[p.x];
        var individuals = grouped_individuals[country_code][industry];

        // TODO Why cant we set tooltip position like this
        var position = {
            "left": d3.event.pageX + 40 + "px"
            , "top": d3.event.pageY - 45 + "px"
        }

        Session.set("showTooltip", true);

        Template.tooltip.position = position;
        Template.tooltip.individuals = individuals;
        Template.tt_list.categoryA = country[country_code];
        Template.tt_list.categoryB = industry;
        if($(window).width() >= d3.event.pageX + 150 + 30 + $("#tooltip").width()) {
            $("#tooltip").css("left", (d3.event.pageX + 90) + "px").css("top", (d3.event.pageY - 95) + "px");
        } else {
            $("#tooltip").show().css("left", (d3.event.pageX - 150 - $("#tooltip").width()) + "px").css("top", (d3.event.pageY - 65) + "px").css("padding", "15px");
        }        
        $("#tooltip").show()       
    }

    function mouseout(p) {
        Session.set("showTooltip", false);
        d3.selectAll("text").classed("active", false);
    }

    function countryOrder(value) {
        matrixScales.x.domain(country_orders[value]);

        var t = svg.transition().duration(500);

        t.selectAll(".row")
        .delay(function(d, i) { return matrixScales.x(i) * 1; })
        .attr("transform", function(d, i) { return "translate(0," + matrixScales.x(i) + ")"; });

        t.selectAll(".column")
        .delay(function(d, i) { return matrixScales.x(i) * 1; })
        .attr("transform", function(d, i) { return "translate(" + matrixScales.y(i) + ")rotate(-90)"; })
        .selectAll(".cell")
        .delay(function(d) { return matrixScales.x(d.x) ; })
        .attr("x", function(d) { return -matrixScales.x(d.y) - matrixScales.x.rangeBand(); });
    }

    function industryOrder(value) {
        matrixScales.y.domain(industry_orders[value]);

        var t = svg.transition().duration(500);

        t.selectAll(".row")
        .delay(function(d, i) { return matrixScales.x(i) * 1; })
        .attr("transform", function(d, i) { return "translate(0," + matrixScales.x(i) + ")"; });

        t.selectAll(".column")
        .delay(function(d, i) { return matrixScales.x(i) * 1; })
        .attr("transform", function(d, i) { return "translate(" + matrixScales.y(i) + ")rotate(-90)"; })
        .selectAll(".cell")
        .delay(function(d) { return matrixScales.x(d.x) ; })
        .attr("x", function(d) { return -matrixScales.x(d.y) - matrixScales.x.rangeBand(); });
    }

    /* 
     * Legend
     */ 

    var colorScale = d3.select(this.find("svg.color-scale"))
        .attr("width", matrixProps.width + matrixProps.margin.left + matrixProps.margin.right)
        .attr("height", "30px");

    var gradient = colorScale.append("svg:linearGradient")
        .attr("id", "gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%")
        .attr("spreadMethod", "pad");

    gradient.append("svg:stop")
        .attr("offset", "0%")
        .attr("stop-color", "#f1e7d0")
        .attr("stop-opacity", 1);

    gradient.append("svg:stop")
        .attr("offset", "100%")
        .attr("stop-color", "red")
        .attr("stop-opacity", 1);

    colorScale.append("rect")
        .attr("width", matrixProps.width + matrixProps.margin.left + matrixProps.margin.right)
        .attr("height", "30px");

    colorScale.append("text")
        .attr("x", 5)
        .attr("y", "21px")
        .text("0%");

    colorScale.append("text")
        .attr("x", matrixProps.width/4)
        .attr("y", "21px")
        .text("25%");

    colorScale.append("text")
        .attr("x", matrixProps.width/2)
        .attr("y", "21px")
        .text("50%");

    colorScale.append("text")
        .attr("x", 3*matrixProps.width/4)
        .attr("y", "21px")
        .text("75%");

    colorScale.append("text")
        .attr("x", matrixProps.width - 5)
        .attr("y", "21px")
        .text("100%");
}