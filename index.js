import * as fs from 'fs';
import * as util from 'util';
var tmp = require('tmp');

var DEBUG = process.env.NODE_DEBUG && /fs/.test(process.env.NODE_DEBUG);

function rethrow() {
  // Only enable in debug mode. A backtrace uses ~1000 bytes of heap space and is fairly slow to generate.
  if (DEBUG) {
    var backtrace = new Error();
    return function(err) {
      if (err) {
        backtrace.stack = err.name + ': ' + err.message +
          backtrace.stack.substr(backtrace.name.length);
        err = backtrace;
        throw err;
      }
    };
  }

  return function(err) {
    if (err) {
      throw err; // Forgot a callback but don't know where? Use NODE_DEBUG=fs
    }
  };
}

module.exports = async function prependFile(path, data, options) {

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
