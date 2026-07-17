fetch("https://inboxes.com/api/v2/message/VVqOaWFfq1rFFZCmZeGIQ1dsywtcYF")
  .then(res => res.json())
  .then(data => console.log(Object.keys(data)))
  .catch(err => console.error(err));
