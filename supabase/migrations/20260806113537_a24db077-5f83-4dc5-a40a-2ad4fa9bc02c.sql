UPDATE auth.users
SET encrypted_password = crypt('VivaTHP26', gen_salt('bf')),
    updated_at = now()
WHERE email = 'msanchez@tuhogarposible.com';