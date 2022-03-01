#/bin/sh
if [ ! -d test/src ] ; then mkdir test/src; fi
sed < test/index.ts > test/src/index.ts -e 's;./src;.;'
for x in src/key-binder.ts src/edit-box.ts ;
do
  sed < ${x} > test/${x} -e 's;createjs-module;../mock-createjs-module;'
done
tsc -p test; 
node test/dist/test-edit-box.js
