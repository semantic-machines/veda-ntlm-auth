#!/bin/bash

time=`date -Iseconds`
echo $time
/sbin/start-stop-daemon --start --verbose --chdir $PWD --make-pidfile --pidfile $PWD/.pid --background --startas /bin/bash -- -c "exec node src/main.js >> $PWD/veda-ntlm-auth-$time.log 2>&1"