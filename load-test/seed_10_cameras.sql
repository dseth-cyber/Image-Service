-- Seed 10 cameras for Stage 1 Load Test
DO $$
DECLARE
  ret_id UUID;
  cam_id UUID;
  cam_names TEXT[] := ARRAY[
    'Assembly-Line-Cam-01', 'Assembly-Line-Cam-02',
    'Paint-Shop-Cam-01',   'Paint-Shop-Cam-02',
    'Welding-Cam-01',      'Welding-Cam-02',
    'Inspection-Cam-01',   'Inspection-Cam-02',
    'Packaging-Cam-01',    'Packaging-Cam-02'
  ];
  smb_user TEXT := 'camera';
  smb_pass_encrypted TEXT := 'smbpass';
  smb_host TEXT := '//image-smb-server/images';
  uuid_base TEXT;
BEGIN
  SELECT id INTO ret_id FROM retention_policies LIMIT 1;

  FOR i IN 1..10 LOOP
    uuid_base := '00000000-0000-0000-0000-0000000001' || LPAD(i::TEXT, 2, '0');
    cam_id := uuid_base::UUID;

    INSERT INTO cameras (id, name, description, ip_address, smb_share_path, "smbDomain", smb_username, smb_password_encrypted, smb_subdirectory_pattern, status, enabled, poll_interval_seconds, timezone, metadata, capture_mode, retention_policy_id, total_images_count, created_at, updated_at)
    VALUES (
      cam_id,
      cam_names[i],
      'Load test camera ' || i || ' - ' || cam_names[i],
      '192.168.200.' || (i + 100),
      smb_host || '/cam_' || i,
      NULL,
      smb_user,
      smb_pass_encrypted,
      NULL,
      'active',
      TRUE,
      30,
      'UTC',
      '{}',
      'periodic',
      ret_id,
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      smb_share_path = EXCLUDED.smb_share_path,
      status = 'active',
      enabled = TRUE;

    RAISE NOTICE 'Camera %: % (id=%) -> %/cam_%', i, cam_names[i], cam_id, smb_host, i;
  END LOOP;
END $$;
