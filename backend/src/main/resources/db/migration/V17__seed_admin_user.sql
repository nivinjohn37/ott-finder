-- Promote the app owner to admin role
UPDATE users SET role = 'admin' WHERE email = 'getnivinjohn@gmail.com';
