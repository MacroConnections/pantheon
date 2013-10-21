// TODO Namespace these

var scatterplotProps = {
	width: 725,
	height: 560
};

Template.scatterplot_svg.properties = scatterplotProps;

var color_domains = d3.scale.ordinal()
	.domain(["INSTITUTIONS", "ARTS", "HUMANITIES", "BUSINESS & LAW", "EXPLORATION", "PUBLIC FIGURE", "SCIENCE & TECHNOLOGY", "SPORTS"])
	.range(["#ECD078", "#D95B43", "#43c1d9", "#C02942", "#546c97", "#d278c2", "#53a9f1", "#79BD9A"]);

var color_countries = d3.scale.ordinal()
    .domain(["Africa", "Asia", "Europe", "North America", "South America", "Oceania"])
    .range(["#E0BA9B", "#D95B43", "#43c1d9", "#C02942", "#546c97", "#d278c2"]);

Template.scatterplot_svg.rendered = function() {
	var context = this;
    // if( this.rendered ) return;
    // this.rendered = true;
	var viz = d3plus.viz();
	
	var vizMode = Session.get('vizMode');
	if (vizMode === 'country_vs_country') {
		var field = 'countryCode';
		var x_code = Session.get('countryX');
		var y_code = Session.get('countryY');
		var x_name = Countries.findOne({countryCode: x_code}).countryName;
		var y_name = Countries.findOne({countryCode: y_code}).countryName;

        var aggregatedField = 'occupation';

        var nesting = ["nesting_1", "nesting_3", "nesting_5"];
        var nestingDepth = "nesting_3";
	} else if (vizMode === 'lang_vs_lang') {
		var field = 'lang';
		var x_code = Session.get('languageX');
		var y_code = Session.get('languageY');
		var x_name = Languages.findOne({lang: x_code}).lang_name;
		var y_name = Languages.findOne({lang: y_code}).lang_name;

        var aggregatedField = 'occupation';

        var nesting = ["nesting_1", "nesting_3", "nesting_5"];
        var nestingDepth = "nesting_3";
	} else if (vizMode === 'domain_vs_domain') {
		var field = 'domain';
		var x_code = Session.get('categoryX');
		var y_code = Session.get('categoryY');
		var x_name = x_code;
		var y_name = y_code;

        var aggregatedField = 'countryName';

        var nesting = ["nesting_1", "nesting_3"];
        var nestingDepth = "nesting_3";
	}

	var data = Scatterplot.find().fetch();
    var aggregated = {};  // X, Y values for each data point (eg. {WRITER: {x:1, y:5}})
    var flatData = [];  // Array of objects {xname: 130, yname:87, id: PHYSICIST}
    var attrs = {};

	if (vizMode === 'country_vs_country' || vizMode === 'lang_vs_lang') {
		var attr = Domains.find().fetch();
        attr.forEach(function(a){
            var dom = a.domain;
            var ind = a.industry;
            var occ = a.occupation;
            var dom_color = color_domains(dom.toUpperCase());
            var domDict = {
                id: dom
                , name: dom
            };
            var indDict = {
                id: ind
                , name: ind
            };
            var occDict = {
                id: occ
                , name: occ
            };
            attrs[dom] = {
                id: dom
                , name: dom
                , color: dom_color
                , nesting_1: domDict
            };
            attrs[ind] = {
                id: ind
                , name: ind
                , color: dom_color
                , nesting_1: domDict
                , nesting_3: indDict
            };
            attrs[occ] = {
                id: occ
                , name: occ
                , color: dom_color
                , nesting_1: domDict
                , nesting_3: indDict
                , nesting_5: occDict
            };
        });
	} else if (vizMode === 'domain_vs_domain') {
		var attr = Countries.find().fetch();
        attr.forEach(function(a){
            var continent = a.continentName;
            var countryCode = a.countryCode;
            var countryName = a.countryName;
            var continent_color = color_countries(continent);
            var continentDict = {
                id: continent
                , name: continent
            };
            var countryDict = {
                id: countryName
                , name: countryName
            };
            attrs[continent] = {
                id: continent
                , name: continent
                , color: continent_color
                , nesting_1: continentDict
            };
            attrs[countryName] = {
                id: countryName
                , name: countryName
                , color: continent_color
                , nesting_1: continentDict
                , nesting_3: countryDict
            };
        });
	}

    // AGGREGATE
	for (i in data) {
		var datum = data[i]
		var dataPoint = datum[aggregatedField];
		var count = datum.count;
		var code = datum[field];

		var axis = code == x_code ? 'x' : 'y';
		var other_axis = axis == 'x' ? 'y' : 'x';

    	if (!aggregated.hasOwnProperty(dataPoint)) {
    		aggregated[dataPoint] = {};
    		aggregated[dataPoint][axis] = count;
    		aggregated[dataPoint][other_axis] = 0;
    	} else {
    		aggregated[dataPoint][axis] += count;
    	}
	}
	
    // FLATTEN
	for (var dataPoint in aggregated) {
		var datum = aggregated[dataPoint];
		var x = datum.x;
		var y = datum.y;

    	var d = {
			id: dataPoint
			, name: dataPoint
			, active1: true
			, active2: true
			, year: 2002
		}
        console.log(x_name, y_name, x, y)
		d[x_name] = x;
		d[y_name] = y;
		d['total'] = x + y;
		flatData.push(d);          
	}

	text_formatting = function(d) {
		return d.charAt(0).toUpperCase() + d.substr(1);
	}
	inner_html = function(obj) {
		return "This is some test HTML";
	}

    console.log("orignal data", data);
	console.log("aggregated", aggregated);
	console.log("FLAT DATA: ", flatData);
	console.log("ATTRS: ", attrs);

	viz
	    .type("pie_scatter")
	    // .dev(true)
	    .width($('.page-middle').width() - 20)
	    .height($('.page-middle').height() - 20)
	    .id_var("id")
	    .attrs(attrs)
	    .text_var("name")
	    .xaxis_var(x_name)
	    .yaxis_var(y_name)
	    .value_var("total")
        .nesting(nesting)
        .depth(nestingDepth)
        .text_format(text_formatting)
        .spotlight(false)
        .active_var("active1")
        .click_function(inner_html)
        .background("#000000")
        .font("Lato")
        .font_weight(400)
        .mirror_axis(false)

    d3.select(context.find("svg"))
        .datum(flatData)
        .call(viz)

}