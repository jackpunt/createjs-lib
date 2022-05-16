#/bin/sh
rm -rf test/dist
if [ ! -d test/src ] ; then mkdir test/src; fi
sed < test/index.ts > test/src/index.ts -e 's;./src;.;'
for x in src/key-binder.ts src/edit-box.ts ;
do
  sed < ${x} > test/${x} -e 's;@thegraid/easeljs-module;../mock-createjs-module.js;'
done
tsc -p test; 
node test/dist/test-key-dispatch.js
node test/dist/test-edit-box.js
