const sgMail = require("@sendgrid/mail");
const axios = require("axios");

export default ({ filter, action }, { services }) => {
  const { ItemsService } = services;
  filter("email_marketing.items.create", async (payload, meta, context) => {
    try {
      if (payload.type == "single_send_email") {
        const {
          publish_on,
          subject,
          text,
          button_link,
          button_text,
          media,
          customers,
        } = payload;

        const { schema, accountability } = context;

        const customerCollection = new ItemsService("customer", {
          schema: schema,
          accountability: accountability,
        });

        const emailRecipients = [];
        for (let i = 0; i < customers?.create.length; i++) {
          const userId = customers?.create[i]?.customer_id.id;
          const customerData = await customerCollection.readByQuery({
            filter: { id: { _eq: userId } },
          });
          const customerEmail = customerData[0]?.email;
          emailRecipients.push({ email: customerEmail });
        }
        console.log(emailRecipients);

        const currentTimestampInSeconds = Math.floor(
          new Date().getTime() / 1000
        );

        const scheduledDateTime = publish_on; // Replace this with the actual value from the body

        const scheduledTimestamp = Math.floor(
          new Date(scheduledDateTime).getTime() / 1000
        );
        const timeUntilScheduled =
          scheduledTimestamp - currentTimestampInSeconds;
        const apiUrl = "https://api.sendgrid.com/v3/mail/send";
        const emailData = {
          personalizations: [
            {
              to: emailRecipients,
              subject: subject,
            },
          ],
          from: { email: "support@trycomeata.com" },
          content: [
            {
              type: "text/html",
              value: `      <!DOCTYPE html>
              <html>
              <head>
              <title>Page Title</title>
              </head>
              <body>
              <table bgcolor="#ffffff" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:800px" class="m_8469802475312108478responsive-table">
                                          <tbody><tr>
                                              <td>                                   
                                                  <table width="100%" border="0" cellspacing="0" cellpadding="0">                                  
              <tbody><tr>
              </tr>
                <tr>
                    <td align="center" style="font-size:24px;color:#0e0e0f;font-weight:700;font-family:Helvetica Neue;line-height:28px;vertical-align:top;text-align:center;padding:35px 40px 0px 40px">
                        <strong>Comeata</strong>
                    </td>
                </tr>
                                                  <tr>
                                                      <td class="m_8469802475312108478content" style="font:16px/22px 'Helvetica Neue',Arial,'sans-serif';text-align:left;color:#555555;padding:40px 40px 0 40px">
                                                          <p style="font-size:16px">
                                                          ${text}
              </p>
                                                      </td>
                                                  </tr>
                                                         <tr>
                                                      <td class="m_8469802475312108478content" style="font:16px/22px 'Helvetica Neue',Arial,'sans-serif';text-align:left;color:#555555;padding:40px 40px 0 40px">
                                                           <img src="https://comeata.agpro.co.in/assets/${media}" alt="imag" style="width: 100%; height: 100%;" />
                                                     </td>
                                                  </tr>
                                                  <tr>
                  <td>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:30px 0px">
                  <tbody><tr>
                      <td align="center" style="text-align:center">
                          <a name="m_8469802475312108478_CTA" bgcolor="#000" style="color:#ffffff;background-color:#000;display:inline-block;font-family:Helvetica Neue;font-size:16px;line-height:30px;text-align:center;font-weight:bold;text-decoration:none;padding:5px 20px;border-radius:3px;text-transform:none" href="${button_link}" >${button_text}</a>
                      </td>
                  </tr>
              </tbody></table>
                 </td>
              </tr>
                                                  </tbody></table>
                                              </td>
                                          </tr>                        
                                          <tr><td width="100%" align="center" valign="top" bgcolor="#ffffff" height="45"></td></tr>
                                      </tbody></table>
              </body>
              </html>`,
            },
          ],
          send_at: currentTimestampInSeconds + timeUntilScheduled,
        };

        const response = await axios.post(apiUrl, emailData, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EMAIL_SENDGRID_API_KEY}`,
          },
        });

        // Check if the response is successful (status 200-299)
        if (response.status < 200 || response.status >= 300) {
          console.log("Failed to schedule email");
          throw new Error(error);
        }

        // Response data is already parsed as JSON
        console.log("email scheduled successfully");
      }
    } catch (error) {
      console.error(error);
    }
    console.log("Creating Item!");
  });

  filter("customer.items.create", async (payload, meta, context) => {
    try {
      // const marketingCollection = new ItemsService("email_marketing", {
      // 	schema: schema,
      // 	accountability: accountability
      // })

      console.log(payload);
      //    const userId = payload.user_created
      // const marketingData = await marketingCollection.readByQuery({
      // 	filter: {"user_created": {"_eq": userId}}
      // })
    } catch (err) {
      console.log(err);
    }
  });

  action("customer.items.create", async (meta, context) => {
    const { schema, accountability } = context;

    console.log(meta);
    const customerCollection = new ItemsService("customer", {
      schema: schema,
      accountability: accountability,
    });
    const marketingCollection = new ItemsService("email_marketing", {
      schema: schema,
      accountability: accountability,
    });
    const customerData = await customerCollection.readOne(meta.key);
    const email = customerData?.email;
    console.log(email);
    console.log(customerData);

    if (customerData?.isEmailSubscribe == true) {
      const userId = customerData?.user_created;
      console.log(userId);

      // const marketingData = await marketingCollection.readByQuery({
      // 	filter: {"user_created": {"_eq": userId}}
      // })
      const type = "email_journey";
      const status = "active";
      const marketingData = await marketingCollection.readByQuery({
        filter: {
          user_created: { _eq: userId },
          type: { _eq: type },
          status: { _eq: status },
        },
      });
      console.log(marketingData);

      marketingData.forEach(async (data) => {
        const { subject, text, button_link, button_text, media } = data;
        if (data.wait == 0) {
          const apiUrl = "https://api.sendgrid.com/v3/mail/send";
          const emailData = {
            personalizations: [
              {
                to: [{ email: email }],
                subject: subject,
              },
            ],
            from: { email: "support@trycomeata.com" },
            content: [
              {
                type: "text/html",
                value: `      <!DOCTYPE html>
                <html>
                <head>
                <title>Page Title</title>
                </head>
                <body>
                <table bgcolor="#ffffff" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:800px" class="m_8469802475312108478responsive-table">
                                            <tbody><tr>
                                                <td>                                   
                                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">                                  
                <tbody><tr>
                </tr>
                  <tr>
                      <td align="center" style="font-size:24px;color:#0e0e0f;font-weight:700;font-family:Helvetica Neue;line-height:28px;vertical-align:top;text-align:center;padding:35px 40px 0px 40px">
                          <strong>Comeata</strong>
                      </td>
                  </tr>
                                                    <tr>
                                                        <td class="m_8469802475312108478content" style="font:16px/22px 'Helvetica Neue',Arial,'sans-serif';text-align:left;color:#555555;padding:40px 40px 0 40px">
                                                            <p style="font-size:16px">
                                                            ${text}
                </p>
                                                        </td>
                                                    </tr>
                                                           <tr>
                                                        <td class="m_8469802475312108478content" style="font:16px/22px 'Helvetica Neue',Arial,'sans-serif';text-align:left;color:#555555;padding:40px 40px 0 40px">
                                                             <img src="https://comeata.agpro.co.in/assets/${media}" alt="imag" style="width: 100%; height: 100%;" />
                                                       </td>
                                                    </tr>
                                                    <tr>
                    <td>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:30px 0px">
                    <tbody><tr>
                        <td align="center" style="text-align:center">
                            <a name="m_8469802475312108478_CTA" bgcolor="#000" style="color:#ffffff;background-color:#000;display:inline-block;font-family:Helvetica Neue;font-size:16px;line-height:30px;text-align:center;font-weight:bold;text-decoration:none;padding:5px 20px;border-radius:3px;text-transform:none" href="${button_link}" >${button_text}</a>
                        </td>
                    </tr>
                </tbody></table>
                   </td>
                </tr>
                                                    </tbody></table>
                                                </td>
                                            </tr>                        
                                            <tr><td width="100%" align="center" valign="top" bgcolor="#ffffff" height="45"></td></tr>
                                        </tbody></table>
                </body>
                </html>
`,
              },
            ],
          };

          const response = await axios.post(apiUrl, emailData, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.EMAIL_SENDGRID_API_KEY}`,
            },
          });

          // Check if the response is successful (status 200-299)
          if (response.status < 200 || response.status >= 300) {
            console.log("Failed to schedule email");
            throw new Error(error);
          }

          // Response data is already parsed as JSON
          console.log("email scheduled successfully");
        } else {
          const hoursToAdd = data.wait;
          const currentTimestampInSeconds = Math.floor(
            new Date().getTime() / 1000
          );
          const sendAtTimestamp = currentTimestampInSeconds + hoursToAdd * 3600;
          const apiUrl = "https://api.sendgrid.com/v3/mail/send";
          const emailData = {
            personalizations: [
              {
                to: [{ email: email}],
                subject: subject,
              },
            ],
            from: { email: "support@trycomeata.com" },
            content: [
              {
                type: "text/html",
                value: `      <!DOCTYPE html>
                <html>
                <head>
                <title>Page Title</title>
                </head>
                <body>
                <table bgcolor="#ffffff" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:800px" class="m_8469802475312108478responsive-table">
                                            <tbody><tr>
                                                <td>                                   
                                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">                                  
                <tbody><tr>
                </tr>
                  <tr>
                      <td align="center" style="font-size:24px;color:#0e0e0f;font-weight:700;font-family:Helvetica Neue;line-height:28px;vertical-align:top;text-align:center;padding:35px 40px 0px 40px">
                          <strong>Comeata</strong>
                      </td>
                  </tr>
                                                    <tr>
                                                        <td class="m_8469802475312108478content" style="font:16px/22px 'Helvetica Neue',Arial,'sans-serif';text-align:left;color:#555555;padding:40px 40px 0 40px">
                                                            <p style="font-size:16px">
                                                            ${text}
                </p>
                                                        </td>
                                                    </tr>
                                                           <tr>
                                                        <td class="m_8469802475312108478content" style="font:16px/22px 'Helvetica Neue',Arial,'sans-serif';text-align:left;color:#555555;padding:40px 40px 0 40px">
                                                             <img src="https://comeata.agpro.co.in/assets/${media}" alt="imag" style="width: 100%; height: 100%;" />
                                                       </td>
                                                    </tr>
                                                    <tr>
                    <td>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:30px 0px">
                    <tbody><tr>
                        <td align="center" style="text-align:center">
                            <a name="m_8469802475312108478_CTA" bgcolor="#000" style="color:#ffffff;background-color:#000;display:inline-block;font-family:Helvetica Neue;font-size:16px;line-height:30px;text-align:center;font-weight:bold;text-decoration:none;padding:5px 20px;border-radius:3px;text-transform:none" href="${button_link}" >${button_text}</a>
                        </td>
                    </tr>
                </tbody></table>
                   </td>
                </tr>
                                                    </tbody></table>
                                                </td>
                                            </tr>                        
                                            <tr><td width="100%" align="center" valign="top" bgcolor="#ffffff" height="45"></td></tr>
                                        </tbody></table>
                </body>
                </html>`,
              },
            ],
            send_at: sendAtTimestamp,
          };

          const response = await axios.post(apiUrl, emailData, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.EMAIL_SENDGRID_API_KEY}`,
            },
          });

          // Check if the response is successful (status 200-299)
          if (response.status < 200 || response.status >= 300) {
            console.log("Failed to schedule email");
            throw new Error(error);
          }

          // Response data is already parsed as JSON
          console.log("email scheduled successfully");
        }
      });
    }
  });
};
