const newVoucherMail = (voucherId, owner_name, code, amount, logo, title, backgroundStyle) => {
  console.log(voucherId);
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${title} Voucher</title>
    <style type="text/css">
  /* Desktop default */
  .card {
    height: 240px;
  }
  /* Mobile Styles */
  @media only screen and (max-width: 600px) {
    .card {
      height: 230px !important;
    }
  }
</style>

  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4;">
    <center>
      <!-- Outer container table -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f5f5f5" style="padding: 20px 0;">
        <tr>
          <td align="center">
            <!-- Inner container table -->
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 6px; overflow: hidden;">
              <!-- Header / Title -->
              <tr>
                <td align="center" style="padding: 20px;">
                  <h1 class="title" style="font-size: 24px; color: #1f0047; margin: 0;">
                    ${title} Voucher
                  </h1>
                </td>
              </tr>
              <!-- Intro text -->
              <tr>
                <td class="inner-content" style="padding: 20px;">
                  <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi there,</p>
                  <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">
                    You’ve received a voucher from ${owner_name} — "${title}" Voucher!
                  </p>
                </td>
              </tr>
              <!-- Redemption text and button -->
              <tr>
                <td align="center" style="padding: 0 20px 20px 20px;">
                  <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">
                    To redeem your voucher, simply click below:
                  </p>
                  <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                    <tr>
                      <td align="center" bgcolor="#1f0047" style="border-radius: 4px;">
                        <a href="https://www.usepays.co/cashout" style="
                              display: inline-block;
                              padding: 8px 10px;
                              border-radius: 4px;
                              font-weight: 600;
                              font-size: 13px;
                              color: #ffffff;
                              text-decoration: none;">
                          Click to Redeem
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Main container table for details -->
              <table role="presentation" style="width:100%; border-collapse:collapse; background-color:#ffffff;" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="inner-content" style="padding: 20px;">
                    <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #333;">Here are the details:</p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <!-- Inner container table for cards -->
                    <table role="presentation" style="width:300px; border-collapse:collapse; margin:20px 0;" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- First Card (Front) -->
                        <td style="vertical-align:top; padding:8px;">
                          <div 
                          class="card"
                          style="
                            width:180px;
                            background-color: ${backgroundStyle};
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            overflow: hidden;
                            font-family: Arial, sans-serif;
                            padding: 10px;">
                       <table role="presentation" style="width:100%; border-collapse:collapse;" cellpadding="0" cellspacing="0">
                         <tr>
                            <td style="text-align:left; vertical-align:top; padding:8px;">
                              <img src="cid:pays-logo-cid" alt="Pays Logo" style="display:block; border:0; width:46px; height:14px;" />
                            </td>
                         </tr>
                         <tr>
                         <td style="text-align:center; padding-top:70px; font-size:17px; font-weight:600; color:#333; letter-spacing:-2px;">
                         From: ${owner_name}
                         </td>
                         </tr>
                         <tr>
                            <td style="text-align:left; padding-top:70px;">
                              ${logo !== 'null' ? `<img src="${logo}" alt="Brand Logo" style="display:block; border:0; max-width:66px; height:30px; padding:10px;" />` : ""}
                            </td>
                          </tr>
                      </table>
                    </div>
                  </td>
                      
                      <!-- Second Card (Back) -->
                    
                        <td align="center" style="vertical-align:bottom; padding:40px 8px 0;">
                          <div class="card"
                          style="
                            width:180px;
                            background-color: ${backgroundStyle};
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            overflow: hidden;
                            font-family: Arial, sans-serif;
                            padding: 10px;">
                            <table role="presentation" style="width:100%; border-collapse:collapse;" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="text-align:left; font-size:17px; font-weight:bold; color:#333;">
                                  ${title}
                                </td>
                              </tr>                           
                              <tr>
                                <td style="padding-top:5px; text-align:center; font-size:14px; color:#333; font-weight:500;">
                                  Scan to Redeem
                                </td>
                              </tr>
                              <tr>
                                <td style="text-align:center;">
                                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=130x120&data=https://www.usepays.co/cashout" alt="QR Code" style="display:block; border:0; background-color:transparent; margin:auto; width:130px; height:120px;" />
                                </td>
                              </tr>
                              <tr>
                                <td style="text-align:center; font-size:12px; color:#333;">
                                  ${code}
                                </td>
                              </tr>
                              <tr>
                                <td style="text-align:left;">
                                  ${logo !== 'null' ? `<img src="${logo}" alt="Brand Logo" style="display:block; border:0; max-width:66px; height:30px; padding-top:10px;" />` : ""}
                                </td>
                              </tr>
                            </table>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <!-- End Inner container table for cards -->
                  </td>
                </tr>
              </table>
              <!-- End Main container table -->
            </table>
            <!-- End Inner container table (600px) -->
          </td>
        </tr>
      </table>
      <!-- End Outer container table -->
    </center>
  </body>
</html>
  `;
};

module.exports = newVoucherMail;
