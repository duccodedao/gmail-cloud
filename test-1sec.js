fetch("https://www.1secmail.com/api/v1/?action=getDomainList")
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
