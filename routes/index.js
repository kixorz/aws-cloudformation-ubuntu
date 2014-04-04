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

			res.render('index', { ubuntu: data.aaData });
		});
	});
};