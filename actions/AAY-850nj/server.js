async function(properties, context) {
    // const protocolFix = (possibleUrl) => {
    //   if (possibleUrl.substring(0,7) === "https:") {
    //     return possibleUrl;
    //   } else {
    //     return `https:${possibleUrl}`;
    //   }

    // };

    // this returns an array holding the list of texts (strings), booleans (yes/no) and integers (decimals and numbers)
    const getList = async (thingWithList, startPosition, finishPosition) => {
        return thingWithList.get(startPosition, finishPosition);
    };

    // Send an email:

    const emailObject = {
        From: properties.from,
        To: properties.to,
        Subject: properties.subject,
        TrackOpens: true,
        TrackLinks: "HtmlAndText",
        TextBody: properties.text_body, // "Hello"
    };

    if (typeof properties.html_body !== "undefined" && properties.html_body) {
        emailObject.HtmlBody = properties.html_body; // "<b>Hello</b> <img src=\"cid:image.jpg\"/>" Escape double quotes
    }

    if (typeof properties.reply_to !== "undefined" && properties.reply_to) {
        emailObject.ReplyTo = properties.reply_to;
    }

    if (typeof properties.stream_id !== "undefined" && properties.stream_id) {
        emailObject.MessageStream = properties.stream_id;
    }

    if (typeof properties.attachment_files !== "undefined" && properties.attachment_files) {
        emailObject.Attachments = await getList(properties[`attachment_files`], 0, await properties[`attachment_files`].length());
    }

    if (typeof context.keys["Server key"] !== "undefined" && context.keys["Server key"]) {
        emailObject.secret_key = context.keys["Server key"];
    }

    if (typeof properties.attachment_files !== "undefined" && properties.attachment_files) {
        const listOfFileUrls = await getList(properties[`attachment_files`], 0, await properties[`attachment_files`].length());
        emailObject.fileUrls = listOfFileUrls;
    }

    return {
        would_be_sent: JSON.stringify(emailObject),
    };
}
