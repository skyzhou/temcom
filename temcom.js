#!/usr/bin/env node
/**
 *合并
 */
fs =require('fs');
path =require('path');
temcom = {};
;(function(exports){
	/**
	 *class Compiler
	 */
	Compiler = function(dir,ext){

		this.dir = dir || __dirname;
		this.ext = ext || '.tpl';
		this.r = new RegExp(this.ext+'$');
		this.memo = {};

		this.init(this.dir);
	}
	/**
	 *@param {String} dir "/x"
	 */
	Compiler.prototype.init=function(dir){
		var that = this;
		var callee = arguments.callee;
		fs.readdir(dir,function(err,files){
			files && files.length && files.forEach(function(item){
				//排除windows下的隐藏文件
				if(/^\./.test(item)){
					return;
				}
				var filename = path.normalize(dir+'/'+item);
				if(that.r.test(item)){
					that.add(filename)
				}
				else if(fs.statSync(filename).isDirectory()){
					callee.call(that,filename);
				}
			});
		});
	}
	/**
	 *@param {String} filename  "x.tpl"
	 */
	Compiler.prototype.add = function(filename){
		var that = this;
		exports.say("add "+filename);
		this.memo[filename] = {
			src:filename.replace(this.ext,'.js'),
			map:this.read(filename)
		};

		this.write(filename);

		fs.watchFile(filename,function(){
			exports.say("'"+filename+"' is modified!");
			that.memo[filename].map = that.read(filename);
			that.write(filename);
		})
		
	}
	Compiler.prototype.read = function(filename){
		var tmp=fs.readFileSync(filename).toString(),
			pat=/<template[^>]*name=['"]([\w.]*?)['"][^>]*>([\s\S]*?)<\/template>/ig,
			ret,
			map = {};
		while(ret=pat.exec(tmp)){
			map[ret[1]]=ret[2].replace(/\'/g,"\\'").replace(/[\r\n\t]/g,'').replace(/\r\n/g,'');
		}
		return map;
	}
	/**
	 *@param {String} filename  "x.tpl"
	 */
	Compiler.prototype.write = function(filename){

		var item = this.memo[filename];
		if(!fs.existsSync(item.src)){
			return;
		}

		var codes = fs.readFileSync(item.src).toString();

		var tmp = {},i=0;
		
		for(var p in item.map){
			var n = p.replace(/\./g,"\\.");
			var r = new RegExp("\\/\\*<"+n+">\\*\\/(.*?)\\/\\*<\\/"+n+">\\*\\/",'g')
			codes=codes.replace(r,function(match){
				i++;
				tmp[i] = "/*<"+p+">*/'"+item.map[p]+"'/*</"+p+">*/";
				return '<@'+i+'@>';
			});
			codes=codes.replace(new RegExp(p.replace(/\./g,"\\."),'g'),function(match){
				i++;
				tmp[i] = "/*<"+p+">*/'"+item.map[p]+"'/*</"+p+">*/";
				return '<@'+i+'@>';
			});
			codes=codes.replace(/<@(\d+)@>/g,function(match,i){
				return tmp[i];
			}); 
		}
		fs.writeFileSync(item.src,codes);
	}
	Compiler.prototype.destroy = function(){
		for(var p in this.memo){
			fs.unwatchFile(p);
		}
	}
	
	exports.memo = {};
	exports.index = 0;

	exports.input = function(callback){
		var that = this;
		if(callback){
			this.onInputFn = callback;
		}
		if(!this.onInputInit){
			process.stdin.resume();
			process.stdin.setEncoding('utf8');

			process.stdin.on('data', function(chunk) {
				var argv = chunk.replace(/\r\n/g,'').replace(/[\r\n]/g,'').replace(/\s+/," ").trim().split(' ');
				that.onInputFn(argv);
			});
			this.onInputInit = true;
		}
		
	}
	exports.say = function(out,pre){
		pre = pre || ">";
		out = Array.isArray(out)?out.join("\r\n"+pre):out;
		console.log(pre+out)
	}
	exports.command = function(){
		//list
		//add
		//remove
		var cmd = arguments[0];
		if(this[cmd]){
			this[cmd].apply(this,Array.prototype.slice.call(arguments,1));
		}
	}
	exports.list = function(){
		var list = [];
		for(var p in this.memo){
			var item = this.memo[p];
			list.push(item.index+":\t"+p);
		}
		this.say(list,'---');
	}
	exports.add = function(){
		this.watch.apply(this,Array.prototype.slice.call(arguments,0));
	},
	exports.remove = function(){
		var index = arguments[0];
		for(var p in this.memo){
			var item = this.memo[p];
			if(item.index == index){
				item.compiler.destroy();
				delete this.memo[p];
				exports.say("'"+p+"' has been removed!");
			}
		}
	}
	exports.help = function(){
		var help = [
			"list:\tView the work list;e.g.,'list'",
			"add:\t\tAdd a folder to the list;e.g.,'add f:/test'",
			"remove:\tRemove a folder from the list;e.g,'remove 1'"
		];
		this.say(help,'---');
	}
	exports.watch = function(dir,ext){
		if(dir){
			if(fs.existsSync(dir)){
				if(fs.statSync(dir).isDirectory()){
					if(!ext){
						ext = '.tpl';
					}
					exports.memo[dir]={
						index:++exports.index,
						compiler:new Compiler(dir)
					}
					exports.input(function(argv){
						exports.command.apply(exports,argv);
					})
					return;
				}
				else{
					exports.say("'"+dir+"'' is not a folder!");
				}
			}
			else{
				exports.say("'"+dir+"' does not exist!");
			}
		}
		else{
			exports.say("Please enter the directory address：");
		}
		exports.input(function(argv){
				if(argv[0] == 'add'){
					argv.shift();
				}
				else if(argv[0] == 'help'){
					exports.help();
				}
				else{
					exports.watch.apply(exports,argv);
				}	
		})
	
	};
	
})(temcom);

temcom.watch.apply(temcom,process.argv.slice(2));


