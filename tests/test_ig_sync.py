import unittest
import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ig_sync import fetch_instagram_profile_and_posts, Date_now_fallback

class TestInstagramSync(unittest.TestCase):
    def test_date_now_fallback(self):
        val = Date_now_fallback(0)
        self.assertTrue(isinstance(val, str))
        self.assertTrue(len(val) > 10)

    def test_fetch_structure(self):
        # Fetch only 1 post for speed
        result = fetch_instagram_profile_and_posts('lasertech_schio', max_posts=1)
        self.assertTrue(result.get('success'))
        self.assertIn('profile', result)
        self.assertIn('posts', result)
        self.assertIn('avatar', result)

        profile = result['profile']
        self.assertEqual(profile['username'], 'lasertech_schio')
        self.assertTrue(len(profile['displayName']) > 0)
        self.assertTrue(int(profile['followersCount'].replace('k', '000').replace('.', '')) > 0)

        posts = result['posts']
        self.assertTrue(len(posts) >= 1)
        first_post = posts[0]
        self.assertIn('id', first_post)
        self.assertIn('caption', first_post)
        self.assertIn('images', first_post)
        self.assertTrue(len(first_post['images']) >= 1)
        self.assertTrue(first_post['images'][0].startswith('data:image/jpeg;base64,'))

if __name__ == '__main__':
    unittest.main()
