var fs = require('fs');
var util = require('util');
var tmp = require('tmp');

module.exports.prependFile = async function (path, data, options) {
  if (typeof options === 'function' || !options) {
    options = {
      encoding: 'utf8',
      mode: 438 /*=0666*/
    };
  } else if (util.isString(options)) {
    options = {
      encoding: options,
      mode: 438
    };
  } else if (!util.isObject(options)) {
    throw new TypeError('Bad arguments');
  }

  var appendOptions = {
    encoding: options.encoding,
    mode: options.mode,
    flags: 'a'
  };

  // a temp file is written even if dist file does not exist. PR welcome for better implementation.
  return new Promise((resolve, reject) => {
    tmp.file(function (err, tempFilePath, fd, cleanupCallback) {
        if (err) reject(err);

        fs.writeFile(tempFilePath, data, options, function (err) {
          if (err) reject(err);

          fs.createReadStream(path, options)
            .on('error', function(err) {
              if (err.code === 'ENOENT' /*file does not exist*/) {
                fs.writeFile(path, data, options, function (err) {
                  if (err) reject(err);
                  resolve();
                });
              } 
              
              reject(err);
            })
            .pipe(fs.createWriteStream(tempFilePath, appendOptions))
            .on('error', reject)
            .on('finish', function() {
              fs.createReadStream(tempFilePath, options)
              .on('error', reject)
                .pipe(fs.createWriteStream(path, options))
                .on('error', reject)
                .on('finish', function() {
                  cleanupCallback();
                  resolve();
                });
            });
        });
      });
  })
};

module.exports.sync = function sync(path, data, options) {
  if (!options) {
    options = {
      encoding: 'utf8',
      mode: 438 /*=0666*/
    };
  } else if (util.isString(options)) {
    options = {
      encoding: options,
      mode: 438
    };
  } else if (!util.isObject(options)) {
    throw new TypeError('Bad arguments');
  }

  var currentFileData;

  var appendOptions = {
    encoding: options.encoding,
    mode: options.mode,
    flags: 'w'
  };

  try {
    currentFileData = fs.readFileSync(path, options);
  } catch (err) {
    currentFileData = '';
  }

  fs.writeFileSync(path, data + currentFileData, appendOptions);
};
