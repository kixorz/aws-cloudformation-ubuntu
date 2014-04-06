var https = require('https');

exports.index = function(req, res){
	https.get('https://cloud-images.ubuntu.com/locator/ec2/releasesTable', function(response) {
		var body = '';
		var data = null;

		response.on('data', function (data) {
			body += data;
		});

		response.on('end', function() {
			var str = body.replace(/,\n]/, ']'); //Ubuntu can't produce valid fucking JSON
			data = JSON.parse(str);

			//map data
			var maps = {};

			//64 vs 32 bit
			var bits = { "amd64": 64, "i386": 32 };

			var images = [];
			data.aaData.forEach(function(item) {
				var image = {
					region: item[0],
					name: item[1],
					version: item[2],
					arch: bits[item[3]],
					storage: item[4],
					released_at: item[5],
					ami: item[6].match(/ami-\w{8}/)[0],
					aki: item[7]
				};

				//build maps for controls
				for(var key in image) {
					var map = maps[key];
					var value = image[key];

					if(typeof map == 'undefined') {
						map = maps[key] = {};
					}

					map[value] = 1;
				}

				images.push(image)
			});

			//sort all filters
			for(var key in maps) {
				var map = maps[key];

				var values = [];
				for(var value in map) {
					values.push(value);
				}

				values.sort();

				maps[key] = values;
			}

			var mapped = {};

			//each release
			for(var i in maps.released_at) {
				var released_at = maps.released_at[i];

				if(typeof mapped[released_at] == 'undefined') {
					mapped[released_at] = {};
				}

				var by_release = images.filter(function(image) {
					return image.released_at == released_at;
				});

				//each storage
				for(var j in maps.storage) {
					var storage = maps.storage[j];

					if(typeof mapped[released_at][storage] == 'undefined') {
						mapped[released_at][storage] = {};
					}

					var by_storage = by_release.filter(function(image) {
						return image.storage == storage;
					});

					var region_map = {};

					//each region
					for(var k in maps.region) {
						var region = maps.region[k];

						var by_region = by_storage.filter(function(image) {
							return image.region == region;
						});

						var in_region = {};

						//by_region.foreach arch drop ami
						by_region.forEach(function(image) {
							in_region[image.arch] = image.ami;
						});

						if(by_region.length > 0) {
							region_map[region] = in_region;
						}
					}

					if(by_storage.length > 0) {
						mapped[released_at][storage]['name'] = by_storage[0].name;
						mapped[released_at][storage]['version'] = by_storage[0].version;
					}

					mapped[released_at][storage]['mapping'] = { Mappings: { RegionMap: region_map } };
				}
			}

			res.render('index', {
				maps: maps,
				mapped: mapped
			});
		});
	});
};