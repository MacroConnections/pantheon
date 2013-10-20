function getCountryExportArgs(begin, end, L, country, occ) {
    var args = {
        birthyear : {$gt:begin, $lte:end}
    };
    if (country !== 'all' ) {
        args.countryCode = country;
    }
    if (occ !== undefined && occ !== 'all') {
        args.occupation = occ;
    }
    return args;
}

Meteor.publish("countries_pub", function() {
    return Countries.find();
});

Meteor.publish("domains_pub", function(){
    return Domains.find();
})

Meteor.publish("languages_pub", function() {
    return Languages.find();
});

/*
    Publish the top 10 people for the current query
    This is a static query since the query doesn't ever change for some given parameters
    Push the ids here as well since people will be in the client side
 */
Meteor.publish("peopletop10", function(begin, end, L, country, domain) {
    var sub = this;
    var collectionName = "top10people";

    var args = getCountryExportArgs(begin, end, L, country);

    if (domain.toLowerCase() !== 'all' ) {
        args.$or = [{domain:domain.substring(1)}, {industry:domain.substring(1)}, {occupation:domain.substring(1)}];
    };

    People.find(args, {
        fields: {_id: 1}, //only get the ids of the people - look up the people in the client (from allpeople)
        limit: 10,
        sort: {numlangs: -1}
    }).forEach(function(person){
        sub.added(collectionName, person._id, person);
    });

    sub.ready();

    return;
});

/*
 Publish the top N people for the current query
 This is a static query since the query doesn't ever change for some given parameters
 Push the ids here as well since people will be in the client side
 */
Meteor.publish("peopletopN", function(begin, end, L, country, domain, N) {
    var sub = this;
    var collectionName = "topNpeople";

    var criteria = getCountryExportArgs(begin, end, L, country);

    var projection = {};

    if(N !== 'all'){
        projection.limit = N;
    }

    if (domain.toLowerCase() !== 'all' ) {
        criteria.$or = [{domain:domain.substring(1)}, {industry:domain.substring(1)}, {occupation:domain.substring(1)}];
    };

    People.find(criteria, projection).forEach(function(person){
            sub.added(collectionName, person._id, person);
        });

    sub.ready();

    return;
});

/*
    Publish five people (+/- two) given a rank and either a country, domain, or birthyear range.
    TODO: How do you do this correctly?X1
 */
Meteor.publish("fivepeoplebyrank", function(begin, end, L, country, domain) {
    var sub = this;
    var collectionName = "fivepeople";

    var args  = getCountryExportArgs(begin, end, L, country);

    sub.ready();

    return
})

/*
This is also a static query
Compare to doing People.find(),
this just pushes all the people and forgets about them
and does not incur the overhead of a mongo observe()
*/
Meteor.publish("allpeople", function() {
    var sub = this;

    People.find().forEach(function(person) {
        sub.added("people", person._id, person)
    });

    sub.ready();
    // No stop needed here
});

/*
Pass top five people to populate people

Also a static query
does not send over anything other than the people ids,
because the whole set of people already exists client side
*/
Meteor.publish("tooltipPeople", function(vizMode, begin, end, L, country, countryX, countryY, gender, domain, domainAggregation) {
    var sub = this;
    console.log(country);
    var args = getCountryExportArgs(begin, end, L, country);

    if (vizMode === "country_exports" || vizMode === "matrix_exports") {
        if (domain.toLowerCase() !== 'all' ) {
            // TODO don't include category in this match for pages that are automatically 'all'
            args[domainAggregation] = domain;
        };
    }

    // TODO Return count also
    People.find(args, {
        fields: { _id: 1 },
        limit: 5,
        sort: { numlangs: -1 }
    }).forEach(function (person) {
        console.log(person);
        sub.added("tooltipCollection", person._id, {}) // No other fields in this
    });
    sub.ready();

    // No stop needed here
});


Meteor.publish("tooltipPeopleCount", function(vizMode, begin, end, L, country, countryX, countryY, gender, domain, domainAggregation) {
    var sub = this;
    console.log(country);
    var args = getCountryExportArgs(begin, end, L, country);

    if (vizMode === "country_exports" || vizMode === "matrix_exports") {
        if (domain.toLowerCase() !== 'all' ) {
            // TODO don't include category in this match for pages that are automatically 'all'
            args[domainAggregation] = domain;
        };
    }

    console.log(args);

    // TODO Return count also
    var count = People.find(args).count();
    console.log("PEOPLE COUNT", count);
    sub.added("tooltipPeopleCountCollection", Random.id(), {count: count})

    sub.ready();

    // No stop needed here
});