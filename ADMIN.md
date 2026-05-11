# Admin users + product management

## Make an existing user an admin

Register/login normally, then promote the account in MySQL:

```sql
UPDATE Users SET User_Type = 'admin' WHERE Email = 'you@example.com';
```

## Admin API

Requires a Bearer access token for a user with `User_Type = 'admin'`.

- `POST /api/admin/items` create item
- `PUT /api/admin/items/:id` update item

## Admin UI

Once logged in as an admin, the navbar shows an **Admin** link.

Route:

- `/admin/items`
