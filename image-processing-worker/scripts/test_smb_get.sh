for f in test_small.tiff test_medium.tiff test_large.tiff test_cmyk.tiff test_grayscale.tiff test_multipage.tiff test_xlarge.tiff; do
  size=$(smbclient '//image-smb-server/images' -U 'camera%smbpass' -c "get $f /dev/stdout" 2>/dev/null | wc -c)
  md5=$(smbclient '//image-smb-server/images' -U 'camera%smbpass' -c "get $f /dev/stdout" 2>/dev/null | md5sum)
  echo "$f: size=$size md5=$md5"
done
