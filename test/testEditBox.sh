#/bin/sh
if [ ! -d test/src ] ; then mkdir test/src; fi
sed < test/index.ts > test/src/index.ts -e 's;./src;.;'
for x in basic-intfs functions edit-box key-binder ;
do
  sed < src/${x}.ts  > test/src/${x}.ts -e 's;createjs-module;../mock-createjs-module;'
done
tsc -p test; 
node test/dist/test-edit-box.js
