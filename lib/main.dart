import 'package:flutter/material.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SkynetApp());
}

class SkynetApp extends StatelessWidget {
  const SkynetApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SKYNET',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF080808),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFD4AF37),
          secondary: Color(0xFFFFD76A),
          surface: Color(0xFF171717),
        ),
        fontFamily: 'Roboto',
        useMaterial3: true,
      ),
      home: const SkynetHomePage(),
    );
  }
}

class SkynetHomePage extends StatefulWidget {
  const SkynetHomePage({super.key});

  @override
  State<SkynetHomePage> createState() => _SkynetHomePageState();
}

class _SkynetHomePageState extends State<SkynetHomePage> {
  int _selectedIndex = 0;
  bool _following = false;

  static const gold = Color(0xFFD4AF37);

  final List<Widget> _pages = const [
    _HomeFeed(),
    _ExplorePage(),
    _CreatePage(),
    _LivePage(),
    _ProfilePage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF080808),
        title: const Text(
          'SKYNET',
          style: TextStyle(
            color: gold,
            fontWeight: FontWeight.w900,
            letterSpacing: 3,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Search',
            onPressed: () => setState(() => _selectedIndex = 1),
            icon: const Icon(Icons.search, color: gold),
          ),
          IconButton(
            tooltip: 'Messages',
            onPressed: () => _showNotice('Messaging will be added in a later build.'),
            icon: const Icon(Icons.chat_bubble_outline, color: gold),
          ),
          IconButton(
            tooltip: 'Notifications',
            onPressed: () => _showNotice('Notifications will be added in a later build.'),
            icon: const Icon(Icons.notifications_none, color: gold),
          ),
        ],
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        backgroundColor: const Color(0xFF111111),
        indicatorColor: gold.withValues(alpha: 0.18),
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home, color: gold), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore, color: gold), label: 'Explore'),
          NavigationDestination(icon: Icon(Icons.add_box_outlined), selectedIcon: Icon(Icons.add_box, color: gold), label: 'Create'),
          NavigationDestination(icon: Icon(Icons.live_tv_outlined), selectedIcon: Icon(Icons.live_tv, color: gold), label: 'Live'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person, color: gold), label: 'Profile'),
        ],
      ),
    );
  }

  void _showNotice(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _HomeFeed extends StatelessWidget {
  const _HomeFeed();

  static const gold = Color(0xFFD4AF37);

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: _FeedTab(
                label: 'For You',
                selected: true,
                onTap: () {},
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _FeedTab(
                label: 'Following',
                selected: false,
                onTap: () {},
              ),
            ),
          ],
        ),
        const SizedBox(height: 22),
        const Text('STORIES', style: TextStyle(color: gold, fontWeight: FontWeight.bold, letterSpacing: 2)),
        const SizedBox(height: 12),
        SizedBox(
          height: 94,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: const [
              _StoryBubble(label: 'Your story', add: true),
              _StoryBubble(label: 'Creator 1'),
              _StoryBubble(label: 'Creator 2'),
              _StoryBubble(label: 'Creator 3'),
              _StoryBubble(label: 'Creator 4'),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: const [
            Text('LIVE NOW', style: TextStyle(color: gold, fontWeight: FontWeight.bold, letterSpacing: 2)),
            Text('Discover all', style: TextStyle(color: Colors.white70)),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          height: 175,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: const LinearGradient(
              colors: [Color(0xFF382A0B), Color(0xFF151515), Color(0xFF090909)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            border: Border.all(color: gold.withValues(alpha: 0.55)),
          ),
          child: Stack(
            children: [
              const Positioned(
                top: 18,
                left: 18,
                child: _LivePill(),
              ),
              const Positioned(
                left: 18,
                bottom: 42,
                child: Text('Featured live room', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              ),
              const Positioned(
                left: 18,
                bottom: 17,
                child: Text('Music & Entertainment  •  1.2K watching', style: TextStyle(color: Colors.white70, fontSize: 12)),
              ),
              Positioned(
                right: 16,
                bottom: 16,
                child: Icon(Icons.play_circle_fill, color: gold, size: 42),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text('YOUR FEED', style: TextStyle(color: gold, fontWeight: FontWeight.bold, letterSpacing: 2)),
        const SizedBox(height: 12),
        const _PostCard(
          creator: 'SKYNET Creator',
          caption: 'Welcome to a new world of creativity.',
          likes: '248',
        ),
      ],
    );
  }
}

class _FeedTab extends StatelessWidget {
  const _FeedTab({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: selected ? Colors.black : Colors.white70,
        backgroundColor: selected ? const Color(0xFFD4AF37) : Colors.transparent,
        side: const BorderSide(color: Color(0xFFD4AF37)),
      ),
      child: Text(label),
    );
  }
}

class _StoryBubble extends StatelessWidget {
  const _StoryBubble({required this.label, this.add = false});
  final String label;
  final bool add;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 72,
      margin: const EdgeInsets.only(right: 12),
      child: Column(
        children: [
          Container(
            width: 62,
            height: 62,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFD4AF37), width: 2),
              color: const Color(0xFF202020),
            ),
            child: Icon(add ? Icons.add : Icons.person, color: const Color(0xFFD4AF37), size: 30),
          ),
          const SizedBox(height: 6),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)),
        ],
      ),
    );
  }
}

class _LivePill extends StatelessWidget {
  const _LivePill();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: Colors.red.shade800, borderRadius: BorderRadius.circular(20)),
      child: const Text('LIVE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}

class _PostCard extends StatelessWidget {
  const _PostCard({required this.creator, required this.caption, required this.likes});
  final String creator;
  final String caption;
  final String likes;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF171717),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF4B3B13)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(backgroundColor: Color(0xFF4B3B13), child: Icon(Icons.person, color: Color(0xFFD4AF37))),
              const SizedBox(width: 10),
              Text(creator, style: const TextStyle(fontWeight: FontWeight.bold)),
              const Spacer(),
              const Icon(Icons.more_horiz, color: Colors.white70),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            height: 150,
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              gradient: const LinearGradient(colors: [Color(0xFF29200C), Color(0xFF111111)]),
            ),
            child: const Center(child: Icon(Icons.play_circle_outline, color: Color(0xFFD4AF37), size: 54)),
          ),
          const SizedBox(height: 12),
          Text(caption),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.favorite_border, color: Color(0xFFD4AF37), size: 19),
              const SizedBox(width: 6),
              Text(likes),
              const SizedBox(width: 18),
              const Icon(Icons.mode_comment_outlined, color: Colors.white70, size: 19),
              const SizedBox(width: 6),
              const Text('Comment'),
              const Spacer(),
              const Icon(Icons.share_outlined, color: Colors.white70, size: 19),
            ],
          ),
        ],
      ),
    );
  }
}

class _ExplorePage extends StatelessWidget {
  const _ExplorePage();

  @override
  Widget build(BuildContext context) => const _SimplePage(
    title: 'Explore',
    subtitle: 'Discover creators, categories and trending content.',
    icon: Icons.explore,
  );
}

class _CreatePage extends StatelessWidget {
  const _CreatePage();

  @override
  Widget build(BuildContext context) => const _SimplePage(
    title: 'Create',
    subtitle: 'Photo and video creation will be connected in the next build.',
    icon: Icons.add_a_photo,
  );
}

class _LivePage extends StatelessWidget {
  const _LivePage();

  @override
  Widget build(BuildContext context) => const _SimplePage(
    title: 'Live',
    subtitle: 'Discover live rooms and creators.',
    icon: Icons.live_tv,
  );
}

class _ProfilePage extends StatelessWidget {
  const _ProfilePage();

  @override
  Widget build(BuildContext context) => const _SimplePage(
    title: 'Your Profile',
    subtitle: 'Your profile, posts and creator tools will appear here.',
    icon: Icons.person,
  );
}

class _SimplePage extends StatelessWidget {
  const _SimplePage({required this.title, required this.subtitle, required this.icon});
  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: const Color(0xFFD4AF37), size: 58),
            const SizedBox(height: 18),
            Text(title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Color(0xFFD4AF37))),
            const SizedBox(height: 10),
            Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70, height: 1.5)),
          ],
        ),
      ),
    );
  }
}
