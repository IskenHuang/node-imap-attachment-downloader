var Imap = require('imap'),
    fs = require('fs'),
    nconf = require('nconf').argv().env().file({ file: './config.json' }),  //load config
    mimelib = require("mimelib");

var imap = new Imap({
    user: nconf.get('IMAP_USER'),
    password: nconf.get('IMAP_PASSWORD'),
    host: nconf.get('IMAP_HOST'),
    port: nconf.get('IMAP_PORT'),
    secure: nconf.get('IMAP_SECURE')
});


openInbox(function(err, mailbox) {
    if (err) die(err);
    imap.search( nconf.get('SEARCH_RULE') , function(err, results) {
        if (err) die(err);
        imap.fetch(results,
            { headers: ['from', 'to', 'subject', 'date'], //['from', 'to', 'subject', 'date'], //true
              	body: true,
                // markSeen: true,
                // struct: true,
                // size: true,
                cb: function(fetch) {
          			fetch.on('message', function(msg) {
      	            console.log('Start message no. %s', msg.seqno);
                    // console.log('msg = %j', msg);
                    var mailBody = '';
                    msg.on('headers', function(hdrs) {
                        var subject = mimelib.parseMimeWords(hdrs.subject.toString());
                        console.log('%s', subject);
                    });

                    msg.on('data', function(chunk) {
                        mailBody += chunk.toString('utf8');
                    });

                    msg.on('end', function() {
                        //save mail body
                        if(nconf.get('IS_SAVE_BODY')){
                            console.log('IS_SAVE_BODYIS_SAVE_BODYIS_SAVE_BODYIS_SAVE_BODY');
                            fs.writeFile( nconf.get('SAVE_FILE_PATH')+msg.seqno+'.txt', mailBody);
                        }

                        //split by boundary
                        var sBoundary = mailBody.split(/--.*\r\n/ig);

                        //split by content type
                        for(var i in sBoundary){
                            var c = sBoundary[i];

                            if(c.length > 0 && c.match(/image\/{jpg|jpeg|png}/i)){
                                //save mail body
                                if(nconf.get('IS_SAVE_FILE_ORIGINAL') == true){
                                    fs.writeFile( nconf.get('SAVE_FILE_PATH')+msg.seqno+'-'+i+'.txt', c);
                                }

                                //if attachment split to mutiple block
                                var sf = c.split(/\r\n\r\n/i);
                                if(sf.length > 3){
                                    var fileBase64String = '';
                                    for(var j = 1; j < sf.length; j++){
                                        if(sf[j].length > 0){
                                            fileBase64String += sf[j];
                                        }
                                    }

                                    saveFileWithBase64String(fileBase64String, '', msg.seqno, i);
                                }else{
                                    for(var j in sf){
                                        var f = sf[j];
                                        if(f.length > 5000){
                                            saveFileWithBase64String(f, '', msg.seqno, i);
                                        }
                                    }
                                }
                            }
                        }

                        console.log('Finished message no. %s', msg.seqno);
                    });
      	        });
            }
        }, function(err) {
            if (err) throw err;
                console.log('Done fetching all messages!');
                imap.logout();
            }
        );
    });
});

function die(err) {
    console.log('Uh oh: ' + err);
    process.exit(1);
}

function openInbox(cb) {
    imap.connect(function(err) {
        if (err) die(err);
        imap.openBox('INBOX', true, cb);
    });
}

function saveFileWithBase64String( fileString, fileName, messageNo, fileNo){
    var image = new Buffer( fileString, 'base64');
    var fname = nconf.get('SAVE_FILE_PATH')+messageNo+'-'+fileNo+'-'+new Date().getTime()+'.jpg';
    fs.writeFile( fname, image, function(err) {
        if(err !== null){
            console.log('%s | size = %s', fname, f.length);
        }
    });
}