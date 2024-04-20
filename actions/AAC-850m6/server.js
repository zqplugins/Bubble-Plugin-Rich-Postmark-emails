async function(properties, context) {

  const postmark = require("postmark");
  const mime = require('mime-types');
  const fetch = require('cross-fetch');

  const attachmentsReadyForEmail = [];
  const errors = [];

  const protocolFix = (possibleUrl) => {

    if (possibleUrl.substring(0,4) === "http") {

      return possibleUrl;
   
    } else {

      return `https:${possibleUrl}`;

    }

  };


  // this returns an array holding the list of texts (strings), booleans (yes/no) and integers (decimals and numbers)
  // const getList = (thingWithList, startPosition, finishPosition) => {
  //   return thingWithList.get(startPosition, finishPosition);
  // }

  if (typeof properties.attachment_files !== "undefined" && properties.attachment_files) {
    // const listOfFileUrls = getList(properties[`attachment_files`], 0, properties[`attachment_files`].length());
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
      
      if(errors.length) return {message: "Failed do upload the attached files: "+ errors.join(","), error_code: -1}
  }
  
  // Send an email:
  const client = new postmark.ServerClient(properties.server_api_tokens || context.keys["Server key"]);
    try {
      const emailObject = {
        "From": properties.from,
        "To": properties.to,
        "TrackOpens": properties.track_opens,
        "TrackLinks": properties.track_link_clicks,
      };

      if (typeof properties.html_body !== "undefined" && properties.html_body) {

        emailObject.HtmlBody = properties.html_body; // "<b>Hello</b> <img src=\"cid:image.jpg\"/>" Escape double quotes

      };

      if (typeof properties.text_body !== "undefined" && properties.text_body) {

        emailObject.TextBody = properties.text_body;

      };

      if (typeof properties.subject !== "undefined" && properties.subject) {

        emailObject.Subject = properties.subject; // "<b>Hello</b> <img src=\"cid:image.jpg\"/>" Escape double quotes

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

      const sentEmail = await client.sendEmail(emailObject);

      return {
        "message_id": sentEmail.MessageID, 
        error_code: sentEmail.ErrorCode,
        message: sentEmail.Message,
        submitted_at: sentEmail.SubmittedAt,
        to: sentEmail.To,
        cc: sentEmail.Cc,
        bcc: sentEmail.Bcc,
      }
    } catch (err) {
      return {message: err.toString() + ", " + errors.join(","), error_code: -1}

    };
}