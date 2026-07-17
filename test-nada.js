fetch("https://inboxes.com/api/v2/inbox/test12345")
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
