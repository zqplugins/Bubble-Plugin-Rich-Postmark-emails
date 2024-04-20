async function(properties, context) {

    const postmark = require("postmark");
    const mime = require('mime-types');
    const fetch = require('cross-fetch');

    const attachmentsReadyForEmail = [];
    const errors = [];

    if (!String.prototype.replaceAll) {
        String.prototype.replaceAll = function(str, newStr){
    
            // If a regex pattern
            if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
                return this.replace(str, newStr);
            }
    
            // If a string
            return this.replace(new RegExp(str, 'g'), newStr);
    
        };
    }

    const protocolFix = (possibleUrl) => {

        if (possibleUrl.substring(0, 4) === "http") {

            return possibleUrl;

        } else {

            return `https:${possibleUrl}`;

        }

    };


    // this returns an array holding the list of texts (strings), booleans (yes/no) and integers (decimals and numbers)
    const getList = async (thingWithList, startPosition, finishPosition) => {
        return await thingWithList.get(startPosition, finishPosition);
    }

    const listOfRecipients = await getList(properties[`list_of_tos`], 0, await properties[`list_of_tos`].length());


    const varObject = {};

    for (let i = 0; i < 10; i += 1) {
        if (typeof properties[`var_${i + 1}`] !== "undefined" && properties[`var_${i + 1}`] !== null) {
            varObject[`var${i + 1}`] = await getList(properties[`var_${i + 1}`], 0, await properties[`var_${i + 1}`].length());
        }
    }


    if (typeof properties.attachment_files !== "undefined" && properties.attachment_files) {
        // const listOfFileUrls = getList(properties[`attachment_files`], 0, await properties[`attachment_files`].length());
        const listOfFileUrls = await properties.attachment_files.get(0, await properties.attachment_files.length())
        const promises  = [];
        
        for (let i = 0; i < listOfFileUrls.length; i += 1) {
          promises.push(new Promise(async (resolve, reject)=>{
            try {
              const currentUrl = protocolFix(listOfFileUrls[i]);
              const response = await fetch(currentUrl);
              if(!response.ok) return reject(`response status: ${response.status}, status text: ${response.statusText}`);
    
              const buffered = await response.arrayBuffer();
              const base64file = Buffer.from(buffered).toString('base64');
              resolve(base64file)
            }
            catch (err) {
              reject(err)
            }
          }))
        }
    
        await Promise.allSettled(promises).then(result=>{
          result.forEach(({value: base64EncodedFile, status, reason}, i)=>{
            if(status === "rejected") return errors.push(`URL: ${listOfFileUrls[i]} cannot be uploaded, ${reason}`)
              
              const currentFileName = listOfFileUrls[i].split('/').pop();
              const currentObject = {
                "Name": currentFileName,
                "Content": base64EncodedFile,
                "ContentType": mime.lookup(currentFileName)
              }
              attachmentsReadyForEmail.push(currentObject)
            })
          })

        
          if(errors.length) return {message: ["Failed do upload the attached files", ...errors], error_code: [-1]}
    }

    const client = new postmark.ServerClient(properties.server_api_tokens || context.keys["Server key"]);

    
        try {
            const listOfEmailObjects = [];
            if(listOfRecipients.length === 0) return {message: ["list Of Recipients is empty, please recheck"], code: [-1]}
            for (let i = 0; i < listOfRecipients.length; i++) {
                const emailObject = {
                    "From": properties.from,
                    "To": listOfRecipients[i],
                    "TrackOpens": properties.track_opens,
                    "TrackLinks": properties.track_link_clicks,
                };

                if (typeof properties.html_body !== "undefined" && properties.html_body) {

                    emailObject.HtmlBody = properties.html_body;

                    for (let j = 0; j < 10; j++) {

                        if (typeof varObject[`var${j + 1}`] !== "undefined" && varObject[`var${j + 1}`] !== null) {


                            emailObject.HtmlBody = emailObject.HtmlBody.replaceAll(`{{var${j + 1}}}`, varObject[`var${j + 1}`][i])


                        }

                    }

                };


                if (typeof properties.text_body !== "undefined" && properties.text_body) {

                    emailObject.TextBody = properties.text_body;

                    for (j = 0; j < 10; j++) {

                        if (typeof varObject[`var${j + 1}`] !== "undefined" && varObject[`var${j + 1}`] !== null) {


                            emailObject.TextBody = emailObject.TextBody.replaceAll(`{{var${j + 1}}}`, varObject[`var${j + 1}`][i])


                        }

                    }

                };


                if (typeof properties.subject !== "undefined" && properties.subject) {

                    emailObject.Subject = properties.subject;

                };


                if (typeof properties.reply_to !== "undefined" && properties.reply_to) {

                    emailObject.ReplyTo = properties.reply_to;

                };


                if (typeof properties.stream_id !== "undefined" && properties.stream_id) {

                    emailObject.MessageStream = properties.stream_id;

                };


                if (typeof properties.attachment_files !== "undefined" && properties.attachment_files) {

                    emailObject.Attachments = attachmentsReadyForEmail;

                };

                if (typeof properties.cc !== "undefined" && properties.cc) {

                    emailObject.Cc = properties.cc;

                };

                if (typeof properties.bcc !== "undefined" && properties.bcc) {

                    emailObject.Bcc = properties.bcc;

                };



                listOfEmailObjects.push(emailObject)


            }



            if(listOfEmailObjects.length === 0) return {"error": ["list Of Email Objects is empty, something goes wrong"]}
           const result = await client.sendEmailBatch(listOfEmailObjects);

        //    let messageIDs = result.map(logObj => logObj.MessageID);
           const objToReturn = {
            "message_ids": [], 
            error_code: [],
            message: [],
            submitted_at: [],
            to: [],
            cc: [],
            bcc: [],
           }

           result.forEach((message) =>{
            objToReturn.message_ids.push(message.MessageID);
            objToReturn.error_code.push(message.ErrorCode);
            objToReturn.message.push(message.Message);
            objToReturn.submitted_at.push(message.SubmittedAt);
            objToReturn.to.push(message.To);
            objToReturn.cc.push(message.Cc);
            objToReturn.bcc.push(message.Bcc);
            })

           return objToReturn

        } catch (err) {
            return {"message": [err.toString()]}

        }
  


}