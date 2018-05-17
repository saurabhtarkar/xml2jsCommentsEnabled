(function() {
  var events, isEmpty, sax,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  sax = require('sax');

  events = require('events');

  isEmpty = function(thing) {
    return typeof thing === "object" && (thing != null) && Object.keys(thing).length === 0;
  };

  exports.Parser = (function(_super) {

    __extends(Parser, _super);

    function Parser(opts) {
      this.parseString = __bind(this.parseString, this);
      this.reset = __bind(this.reset, this);
      var key, value;
      this.options = {
        explicitCharkey: false,
        trim: true,
        normalize: true,
        attrkey: "$",
        charkey: "_",
        commentkey: "!--",
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: false,
        parseComments: false
      };
      for (key in opts) {
        if (!__hasProp.call(opts, key)) continue;
        value = opts[key];
        this.options[key] = value;
      }
      this.reset();
    }

    Parser.prototype.reset = function() {
      var attrkey, charkey, commentkey, err, parseComments, stack,
      _this = this;
      this.removeAllListeners();
      this.saxParser = sax.parser(true, {
        trim: false,
        normalize: false
      });
      err = false;
      this.saxParser.onerror = function(error) {
        if (!err) {
          err = true;
          return _this.emit("error", error);
        }
      };
      this.EXPLICIT_CHARKEY = this.options.explicitCharkey;
      this.resultObject = null;
      stack = [];
      attrkey = this.options.attrkey;
      charkey = this.options.charkey;
      commentkey = this.options.commentkey;
      parseComments = this.options.parseComments;
      commentFound = false;
      this.saxParser.onopentag = function(node) {

        var key, obj, _ref;
        obj = {};
        obj[charkey] = "";
        if (!_this.options.ignoreAttrs) {
          _ref = node.attributes;
          for (key in _ref) {
            if (!__hasProp.call(_ref, key)) continue;
            if (!(attrkey in obj) && !_this.options.mergeAttrs) obj[attrkey] = {};
            if (_this.options.mergeAttrs) {
              obj[key] = node.attributes[key];
            } else {
              obj[attrkey][key] = node.attributes[key];
            }
          }
        }
        obj["#name"] = node.name;
        if (commentFound) { /*for the previous comment tag is here:*/
          s = stack[stack.length - 1];
          if (s[commentkey]) {
            var commentArrLen = s[commentkey].length
            if (s[commentkey][commentArrLen-1]) {
              s[commentkey][commentArrLen-1].tag = node.name;
              commentFound = false;
            }
          }
        } else {
          var s = stack[stack.length - 1];
          if (s) {
            if (!s[commentkey]) { s[commentkey] = []}
              s[commentkey].push({tag:node.name,comment:''});
          }
        }
        return stack.push(obj);
      };
      this.saxParser.onclosetag = function() {
        var nodeName, obj, old, s;
        obj = stack.pop();
        nodeName = obj["#name"];
        delete obj["#name"];
        s = stack[stack.length - 1];
        if (obj[charkey].match(/^\s*$/)) {
          delete obj[charkey];
        } else {
          if (_this.options.trim) obj[charkey] = obj[charkey].trim();
          if (_this.options.normalize) {
            obj[charkey] = obj[charkey].replace(/\s{2,}/g, " ").trim();
          }
          if (Object.keys(obj).length === 1 && charkey in obj && !_this.EXPLICIT_CHARKEY) {
            obj = obj[charkey];
          }
        }
        if (_this.options.emptyTag !== void 0 && isEmpty(obj)) {
          obj = _this.options.emptyTag;
        }
        if (stack.length > 0) {
          if (!_this.options.explicitArray) {
            if (!(nodeName in s)) {
              return s[nodeName] = obj;
            } else if (s[nodeName] instanceof Array) {
              return s[nodeName].push(obj);
            } else {
              old = s[nodeName];
              s[nodeName] = [old];
              return s[nodeName].push(obj);
            }
          } else {
            if (!(s[nodeName] instanceof Array)) s[nodeName] = [];
            return s[nodeName].push(obj);
          }
        } else {
          if (_this.options.explicitRoot) {
            old = obj;
            obj = {};
            obj[nodeName] = old;
          }
          _this.resultObject = obj;
          return _this.emit("end", _this.resultObject);
        }
      };
      if (parseComments) {
        this.saxParser.oncomment = function(text) {
          commentFound = true;

          var s;
          s = stack[stack.length - 1];
          if (!s[commentkey]) { s[commentkey] = []}
            if (s) return s[commentkey].push({tag:'',comment:text});/*This hes returnign the parsed comment to onclose prototype*/
        };
      }
      return this.saxParser.ontext = this.saxParser.oncdata = function(text) {
        var s;
        s = stack[stack.length - 1];
        if (s) return s[charkey] += text;
      };
    };

    Parser.prototype.parseString = function(str, cb) {
      if ((cb != null) && typeof cb === "function") {
        this.on("end", function(result) {
          this.reset();
          return cb(null, result);
        });
        this.on("error", function(err) {
          this.reset();
          return cb(err);
        });
      }
      if (str.toString().trim() === '') {
        this.emit("end", null);
        return true;
      }
      return this.saxParser.write(str.toString());
    };

    return Parser;

  })(events.EventEmitter);


  var builder, defaults, escapeCDATA, requiresCDATA, wrapCDATA,
  hasProp = {}.hasOwnProperty;

  builder = require('xmlbuilder');

  defaults = require('./defaults').defaults;

  requiresCDATA = function(entry) {
    return typeof entry === "string" && (entry.indexOf('&') >= 0 || entry.indexOf('>') >= 0 || entry.indexOf('<') >= 0);
  };

  wrapCDATA = function(entry) {
    return "<![CDATA[" + (escapeCDATA(entry)) + "]]>";
  };

  escapeCDATA = function(entry) {
    return entry.replace(']]>', ']]]]><![CDATA[>');
  };

  exports.Builder = (function() {
    function Builder(opts) {
      var key, ref, value;
      this.options = {};
      ref = defaults["0.2"];
      for (key in ref) {
        if (!hasProp.call(ref, key)) continue;
        value = ref[key];
        this.options[key] = value;
      }
      for (key in opts) {
        if (!hasProp.call(opts, key)) continue;
        value = opts[key];
        this.options[key] = value;
      }
    }

    Builder.prototype.buildObject = function(rootObj) {
      var attrkey, charkey, render, rootElement, rootName;
      attrkey = this.options.attrkey;
      charkey = this.options.charkey;
      if ((Object.keys(rootObj).length === 1) && (this.options.rootName === defaults['0.2'].rootName)) {
        rootName = Object.keys(rootObj)[0];
        rootObj = rootObj[rootName];
      } else {
        rootName = this.options.rootName;
      }
      render = (function(_this) {
        return function(element, obj) {

          var attr, child, entry, index, key, value;
          if (typeof obj !== 'object') {
           if (_this.options.cdata && requiresCDATA(obj)) {
            element.raw(wrapCDATA(obj));
          }else {
            element.txt(obj);
          }
        } else if (Array.isArray(obj) && element.name != '!--') {
          for (index in obj) {
            if (!hasProp.call(obj, index)) continue;
            child = obj[index];
            for (key in child) {
              entry = child[key];
              element = render(element.ele(key), entry).up();
            }
          }
        } 
        else {
          var lastComment = [];
          // console.log('obj !-- :', obj);
          for (key in obj) {
            if(key === '!--'){
              lastComment = obj[key];
              continue;
            }else if (!hasProp.call(obj, key)) continue;
            console.log('lastComment: ', lastComment);

            for(c in lastComment){
              console.log('comment.tag, comment.comment: ',lastComment[c].tag, lastComment[c].comment);
              if(lastComment[c].tag === ''){
                var comm = lastComment[c].comment;
                element = render(element.ele('!--'), comm).up(); 
              }
            }

            var lc = lastComment.filter(el => el.tag == key);
            if(lc.length > 0){
              var mycomm = lc[0]['comment'];
              if(mycomm !== '')
                element = render(element.ele('!--'), mycomm).up(); 
              /*first render the comment and then the tag (below)*/
            }
         
          child = obj[key];
          if (key === attrkey) {
            if (typeof child === "object") {
              for (attr in child) {
                value = child[attr];
                element = element.att(attr, value); /*rendering the tag*/
              }
            }
          } else if (key === charkey) {
            if (_this.options.cdata && requiresCDATA(child)) {
              element = element.raw(wrapCDATA(child));
            } else {
              element = element.txt(child);
            }
          } else if (Array.isArray(child)) {
            for (index in child) {
              if (!hasProp.call(child, index)) continue;
              entry = child[index];
              if (typeof entry === 'string') {
                if (_this.options.cdata && requiresCDATA(entry)) {
                  element = element.ele(key).raw(wrapCDATA(entry)).up();
                } else {
                  element = element.ele(key, entry).up();
                }
              } else {
                element = render(element.ele(key), entry).up();
              }
            }
          } else if (typeof child === "object") {
            element = render(element.ele(key), child).up();
          } else {
            if (typeof child === 'string' && _this.options.cdata && requiresCDATA(child)) {
              element = element.ele(key).raw(wrapCDATA(child)).up();
            } else {
              if (child == null) {
                child = '';
              }
              element = element.ele(key, child.toString()).up();
            }
          }
        }
      }
      return element;
    };
  })(this);


  rootElement = builder.create(rootName, this.options.xmldec, this.options.doctype, {
    headless: this.options.headless,
    allowSurrogateChars: this.options.allowSurrogateChars
  });
  return render(rootElement, rootObj).end(this.options.renderOpts);
};

return Builder;

})(events.EventEmitter);


}).call(this);
