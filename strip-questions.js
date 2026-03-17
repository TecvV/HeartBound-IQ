const fs = require('fs');
const path = require('path');
const root = 'C:/Users/YOGESHWAR MISHRA/Desktop/AI Projects/user_vowiq/vowiq/frontend/src';
const exts = new Set(['.js','.jsx','.css']);
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p = path.join(dir, entry.name);
    if(entry.isDirectory()) walk(p);
    else if(exts.has(path.extname(p))){
      let text = fs.readFileSync(p,'utf8');
      const re = /(["'`])((?:\\.|(?!\1).)*)\1/g;
      let changed = false;
      text = text.replace(re, (m,q,s) => {
        const ns = s.replace(/\?/g,'');
        if(ns !== s) changed = true;
        return q + ns + q;
      });
      if(changed) fs.writeFileSync(p, text, 'utf8');
    }
  }
}
walk(root);