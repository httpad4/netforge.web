'use strict';

/*
 * Curriculum seed data. Inserted only when the modules table is empty.
 * Explicit ids are used for stable seed data.
 */

const m = (slug, title, description, sortOrder) => ({ slug, title, description, sortOrder });

const mods = [
  m('networking-basics', 'Networking Basics',
    'What a network is, how computers talk, and the terminology you will use everywhere else in this course.', 1),
  m('osi-tcpip-models', 'OSI & TCP/IP Models',
    'The seven-layer OSI model and the four-layer TCP/IP model that real networks actually use.', 2),
  m('ip-addressing-subnetting', 'IP Addressing & Subnetting',
    'IPv4 addresses, subnet masks, CIDR notation, and the skills to divide networks into subnets.', 3),
  m('routing-switching', 'Routing & Switching',
    'How packets are forwarded between and inside networks by routers and switches.', 4),
  m('dns-dhcp', 'DNS & DHCP',
    'The services that give devices names (DNS) and network configuration (DHCP).', 5),
  m('network-devices-wireless', 'Network Devices & Wireless',
    'The hardware that makes up a network, plus how Wi-Fi carries data over the air.', 6),
  m('network-security-basics', 'Network Security Basics',
    'Threats, defense in depth, and the cryptographic tools that protect data in transit.', 7),
  m('troubleshooting-tools', 'Troubleshooting Tools',
    'A structured way to debug network faults, plus the command-line tools every admin needs.', 8),
];

const modules = [
  {
    slug: 'networking-basics',
    lessons: [
      {
        slug: 'what-is-a-network', title: 'What Is a Network?', type: 'reading', order: 1,
        content: `
# What Is a Network?

A **network** is two or more devices connected so they can share information and resources. When you open a website, stream a video, or send a message, dozens of devices cooperate to carry your data from one place to another.

## Why networks matter

- They let many users share expensive resources (printers, storage, internet links).
- They enable communication between people and between programs.
- They drive almost every modern service, from email to banking to gaming.

## Big and small networks

The table below shows the two categories you will see most often.

| Type | Scope | Example |
| ---- | ----- | ------- |
| LAN | One building or site | An office or home Wi-Fi |
| WAN | Interconnects LANs across cities | The internet backbone |

A **LAN** (Local Area Network) usually belongs to a single owner. A **WAN** (Wide Area Network) connects many LANs together; the largest WAN is the internet.

## How data travels

Devices exchange **packets** — small chunks of data that carry the sender's and receiver's addresses plus a payload. Networks are built around moving packets reliably and quickly.

> Key idea: a network exists whenever one device can send data to another and have it understood. Everything else in this course is about how that happens.
`,
      },
      {
        slug: 'clients-servers-peers', title: 'Clients, Servers & Peers', type: 'reading', order: 2,
        content: `
# Clients, Servers & Peers

Modern networks split work between machines. Understanding these roles makes every later module easier.

## The client-server model

A **server** is a computer that runs software and provides services — it is never switched off on purpose and often has a static address so clients can always find it. A **client** asks for services: your browser, your phone's mail app, a game client.

A typical exchange:

1. Your browser (the client) requests a page from a web server.
2. The web server answers with the page.
3. The client renders it. The roles are distinct and fixed.

## Peer-to-peer

In a **peer-to-peer** (P2P) network, every machine can be both a client and a server. File-sharing applications and some IoT ecosystems use this model, where no machine is in charge.

## Where you meet each model

| Model | Example |
| ----- | ------- |
| Client-server | Web browsing, email, streaming |
| Peer-to-peer | Local file sharing, some messaging apps |

> Watch for servers that quietly depend on other servers — a web server, for instance, may ask a database server for data before it can answer you.
`,
      },
      {
        slug: 'network-topologies', title: 'Network Topologies', type: 'reading', order: 3,
        content: `
# Network Topologies

A **topology** is the shape of a network — how devices are connected. It influences cost, resilience, and how hard the network is to manage.

## Common topologies

- **Bus** — one shared cable, all devices on it. Cheap but a single break takes the whole segment down.
- **Star** — every device connects to a central switch or hub. Most office and home networks are stars. Easy to manage; the center is a single point of failure.
- **Ring** — each device connects to two neighbours, forming a loop. Data flows around the ring; a break is survivable in dual rings.
- **Mesh** — devices connect to many others. Very resilient, used by wireless mesh and the internet's core.
- **Hybrid** — real networks are usually a combination of the above (stars inside a larger hierarchy).

## Practical notes

A topology can be *logical* (how data flows) and *physical* (how cables run). A star network can still behave like a ring if the switch emulates a ring.

## Choosing a topology

- Reliability matters → prefer rings or meshes (redundant paths).
- Simplicity and low cost matter → stars with a good switch are the usual answer.
- Budget and fault-tolerance considerations nearly always trade against each other.
`,
      },
      {
        slug: 'basics-quiz', title: 'Networking Basics Quiz', type: 'quiz', order: 4,
        content: `
# Networking Basics Quiz

Answer all questions and review the feedback. You need **70% or higher** to pass and unlock module progress.

> Tip: if you miss one, read the explanation — the next attempt will be easier.
`,
        quiz: [
          {
            question: 'Which model describes one device asking for services from a machine that provides them?',
            explanation: 'In the client-server model, the client requests and the server provides. The roles are distinct and stable.',
            options: [
              { text: 'Peer-to-peer', correct: false },
              { text: 'Client-server', correct: true },
              { text: 'Bus topology', correct: false },
              { text: 'Mesh topology', correct: false },
            ],
          },
          {
            question: 'A network confined to a single building or site is called a…',
            explanation: 'A LAN covers one site. A WAN interconnects LANs across larger distances.',
            options: [
              { text: 'PAN', correct: false },
              { text: 'MAN', correct: false },
              { text: 'LAN', correct: true },
              { text: 'WAN', correct: false },
            ],
          },
          {
            question: 'Which topology gives the most redundant paths between devices?',
            explanation: 'A mesh gives every device multiple ways to reach the others, so traffic can survive link failures.',
            options: [
              { text: 'Bus', correct: false },
              { text: 'Star', correct: false },
              { text: 'Ring', correct: false },
              { text: 'Mesh', correct: true },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'osi-tcpip-models',
    lessons: [
      {
        slug: 'why-layered-models', title: 'Why Layered Models?', type: 'reading', order: 1,
        content: `
# Why Layered Models?

Networking is complicated. To make it manageable, engineers split the problem into **layers** — each layer handles one job and offers services to the layer above it.

## The benefits of layers

- **Modularity** — swap one technology (e.g. Wi-Fi instead of Ethernet) without rewriting everything.
- **Interoperability** — vendors build independently as long as they follow the same layer rules.
- **Troubleshooting** — you can reason about *which layer* a problem lives in.

## A useful analogy

Think of sending a parcel. The sender's letter (data) is placed in an envelope (addressed), handed to a courier (transport), moved across roads (network), and so on. Each step only needs to understand its own prompt.

## Two models to know

- The **OSI model** (reference, 7 layers) — great for teaching and troubleshooting.
- The **TCP/IP model** (practical, 4 layers) — the set of protocols the internet actually uses.

> Keep both in mind: interviews and textbooks use OSI names, while packets, diagnostics, and vendor docs speak TCP/IP.
`,
      },
      {
        slug: 'the-osi-model', title: 'The OSI Model', type: 'reading', order: 2,
        content: `
# The OSI Model

The **OSI model** (Open Systems Interconnection) divides networking into seven layers, numbered from the bottom — layer 1 is the physical medium, layer 7 is the application you use.

## The seven layers

1. **Physical (1)** — cables, radio, voltages, connectors. Bits move here.
2. **Data Link (2)** — frames on a segment; **MAC addresses**; switches and Wi-Fi work here.
3. **Network (3)** — logical addressing and routing; **IP** lives here; routers work here.
4. **Transport (4)** — end-to-end delivery, ports, reliability (TCP) or speed (UDP).
5. **Session (5)** — establishes and manages conversations.
6. **Presentation (6)** — encoding, encryption, data translation.
7. **Application (7)** — protocols the user touches: **HTTP**, DNS, SMTP.

## A memory trick

Seven letters for the seven layers from top to bottom: **All People Seem To Need Data Processing**.

## Where problems live

When something breaks, ask *which layer*:
- Electricity, cable, Wi-Fi signal → layer 1.
- Wrong MAC, bridge loops, VLAN issues → layer 2.
- Wrong **subnet mask** or route → layer 3.
- Apps time out, ports blocked → layer 4+.
`,
      },
      {
        slug: 'the-tcp-ip-model', title: 'The TCP/IP Model', type: 'reading', order: 3,
        content: `
# The TCP/IP Model

The internet is not built on OSI — it runs the **TCP/IP** protocol suite. TCP/IP collapses the seven OSI layers into four practical ones.

## Four layers

| TCP/IP layer | OSI equivalent | Examples |
| ------------ | -------------- | -------- |
| Application | 5 + 6 + 7 | HTTP, DNS, DHCP, SMTP |
| Transport | 4 | TCP, UDP |
| Internet | 3 | IP, ICMP |
| Link | 1 + 2 | Ethernet, Wi-Fi |

## TCP vs UDP

- **TCP** is reliable: connections, acknowledgements, retransmission. Used by HTTP, email, file transfer.
- **UDP** is fast and connectionless: no handshake, no guarantees. Used by video calls, gaming, DNS queries.

## Three-way handshake

TCP establishes a connection with **SYN → SYN-ACK → ACK**. If the third step never happens, the connection is incomplete — a common thing to look for with packet capture.

## Encapsulation

Each layer wraps the layer above it: your HTTP request is placed inside a TCP segment, which is placed inside an IP packet, which is placed inside an Ethernet frame. Understanding encapsulation is the key to reading and troubleshooting traffic.

> Practical rule: layer numbers rarely appear in vendor GUIs; protocol names (IP, TCP, HTTP) are the words you will actually see.
`,
      },
      {
        slug: 'osi-layer-match-lab', title: 'Lab: Build the OSI Stack', type: 'lab', order: 4,
        content: `
# Lab: Build the OSI Stack

Drag each protocol or device onto the correct OSI layer — or use the dropdown plus the **Move Up / Move Down** buttons. When the stack is complete you can mark this lab done.

<div data-lab="osi-matcher"></div>
`,
      },
      {
        slug: 'models-quiz', title: 'OSI & TCP/IP Models Quiz', type: 'quiz', order: 5,
        content: `
# OSI & TCP/IP Models Quiz

Answer all questions. **70% or higher** to pass.

> Remember: troubleshooting charts start at layer 1 and work upward.
`,
        quiz: [
          {
            question: 'At which OSI layer do routers operate?',
            explanation: 'Routers forward packets using logical (IP) addresses — the Network layer, layer 3.',
            options: [
              { text: 'Physical (1)', correct: false },
              { text: 'Data Link (2)', correct: false },
              { text: 'Network (3)', correct: true },
              { text: 'Transport (4)', correct: false },
            ],
          },
          {
            question: 'Which protocol is connectionless and used for low-latency traffic like video calls?',
            explanation: 'UDP skips handshakes and acknowledgements, trading reliability for speed.',
            options: [
              { text: 'TCP', correct: false },
              { text: 'UDP', correct: true },
              { text: 'HTTP', correct: false },
              { text: 'DNS', correct: false },
            ],
          },
          {
            question: 'Which TCP/IP layer corresponds to OSI layers 5, 6 and 7 combined?',
            explanation: 'TCP/IP\u2019s Application layer wraps session, presentation, and application duties.',
            options: [
              { text: 'Application', correct: true },
              { text: 'Transport', correct: false },
              { text: 'Internet', correct: false },
              { text: 'Link', correct: false },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'ip-addressing-subnetting',
    lessons: [
      {
        slug: 'ipv4-addressing', title: 'IPv4 Addressing', type: 'reading', order: 1,
        content: `
# IPv4 Addressing

Every device on an IP network needs a unique logical address. **IPv4** addresses are 32-bit numbers written as four decimal octets, for example **192.168.1.14**.

## Address structure

An IPv4 address has two parts:

- **Network portion** — identifies which network the device belongs to.
- **Host portion** — identifies the specific device inside that network.

The **subnet mask** (e.g. 255.255.255.0) marks the dividing line.

## Special addresses to know

- **Loopback** — 127.0.0.1 refers to your own device.
- **Private ranges** — 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 are not routable on the public internet; they exist behind **NAT**.
- **Broadcast** — 255.255.255.255 and each subnet\u2019s last address reach every host on that subnet.

## Octets and bits

Each octet is 8 bits, so values range 0–255. Two addresses in a subnet are always reserved: the network address (host bits all zero) and the broadcast address (host bits all one).

> If a device has the wrong subnet mask, it cannot tell which neighbours are local and which need a route — even on the same cable.
`,
      },
      {
        slug: 'cidr-and-subnet-masks', title: 'CIDR & Subnet Masks', type: 'reading', order: 2,
        content: `
# CIDR & Subnet Masks

**CIDR** (Classless Inter-Domain Routing) is the notation that replaced rigid IPv4 "classes". A CIDR block looks like **192.168.1.0/24** — the number after the slash is how many leading bits are the network portion.

## Prefix thickets

A **/24** means 24 network bits, leaving 8 host bits → 2⁸ = 256 addresses. **/25** → 128, **/26** → 64, and so on.

## Common prefixes

| CIDR | Usable hosts | Typical use |
| ---- | ------------ | ----------- |
| /30 | 2 | Point-to-point links |
| /29 | 6 | Small clusters |
| /24 | 254 | Small office LAN |
| /16 | 65,534 | Large private networks |

The usable host count is **2^host_bits − 2** because the network and **broadcast** addresses are reserved.

## Why subnets exist

Subnetting splits one block into smaller networks to:

- Reduce broadcast domains and traffic.
- Isolate departments or security zones.
- Use address space efficiently.

> Practice quick mental math on /24, /25, /26 … /30. When doing the subnet calculator lab, check your arithmetic against the widget.
`,
      },
      {
        slug: 'subnetting-practice', title: 'Subnetting Practice', type: 'reading', order: 3,
        content: `
# Subnetting Practice

Once CIDR notation is familiar, you can solve most subnetting problems with a small repeatable method.

## The method

1. Convert the prefix to **host bits** = 32 − prefix.
2. **Block size** = 2^host_bits.
3. **Network address** = the aligned multiple of the block size.
4. **Broadcast** = network + block size − 1.
5. **Usable range** = network + 1 … broadcast − 1.
6. **Usable hosts** = block size − 2.

## Worked example

Divide **192.168.10.0/24** into four /26 subnets. Block size for /26 is 64.

- 192.168.10.0 – 192.168.10.63 (usable 1–62)
- 192.168.10.64 – 192.168.10.127
- 192.168.10.128 – 192.168.10.191
- 192.168.10.192 – 192.168.10.255

Each subnet holds 62 usable hosts.

## Common mistakes

- Forgetting to subtract 2 for network and broadcast addresses.
- Mismatching the subnet mask on both devices and the gateway.
- Choosing a block size smaller than the host count you need (allow ~20% headroom).

> The subnet calculator lab generates random problems and checks your answers — aim for five correct in a row before completing the lesson.
`,
      },
      {
        slug: 'subnet-calculator-lab', title: 'Lab: Subnet Calculator', type: 'lab', order: 4,
        content: `
# Lab: Subnet Calculator

Use the calculator to compute network address, broadcast address, usable range, and host count for any IP + CIDR. Then solve five generated problems correctly to complete the lab.

<div data-lab="subnet-calculator"></div>
`,
      },
      {
        slug: 'subnetting-quiz', title: 'IP Addressing & Subnetting Quiz', type: 'quiz', order: 5,
        content: `
# IP Addressing & Subnetting Quiz

Answer all questions. **70% or higher** to pass.

> Hints: usable hosts = 2^host_bits − 2. Each subnet\u2019s last address is the broadcast.
`,
        quiz: [
          {
            question: 'How many usable host addresses are in a /24 subnet?',
            explanation: 'A /24 leaves 8 host bits: 2⁸ = 256, minus network and broadcast = 254 usable.',
            options: [
              { text: '254', correct: true },
              { text: '256', correct: false },
              { text: '510', correct: false },
              { text: '128', correct: false },
            ],
          },
          {
            question: 'A /26 subnet block size is…',
            explanation: 'Host bits = 32 − 26 = 6, so the block size is 2⁶ = 64.',
            options: [
              { text: '32', correct: false },
              { text: '62', correct: false },
              { text: '64', correct: true },
              { text: '128', correct: false },
            ],
          },
          {
            question: 'Which address is the broadcast of 192.168.1.0/25?',
            explanation: 'A /25 block is 128 addresses: 192.168.1.0–192.168.1.127, so .127 is the broadcast.',
            options: [
              { text: '192.168.1.255', correct: false },
              { text: '192.168.1.127', correct: true },
              { text: '192.168.1.128', correct: false },
              { text: '192.168.1.1', correct: false },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'routing-switching',
    lessons: [
      {
        slug: 'how-routers-forward', title: 'How Routers Forward', type: 'reading', order: 1,
        content: `
# How Routers Forward

A **router** moves packets between networks. Its job is to look at the destination IP, consult a routing table, and choose the next hop.

## The routing table

A router maintains a **routing table** with entries like:

- Directly connected networks.
- Static routes configured by an admin.
- Dynamic routes learned from routing protocols.

Each route has a prefix and a next hop / outgoing interface. Routers use **longest prefix match**: the most specific entry wins.

## Default gateway

A **default gateway** is the "last resort" route (0.0.0.0/0). Devices send traffic destined outside their subnet to the gateway, which forwards it onward.

## Hop by hop

Routing is hop-by-hop. Every router only decides the *next* hop; the packet is re-addressed at each link. This is why a single down router can break all paths through it.

> A device with no default gateway can reach local hosts but nothing else — check the gateway first when "the internet" is down but LAN works.
`,
      },
      {
        slug: 'routing-protocols', title: 'Routing Protocols', type: 'reading', order: 2,
        content: `
# Routing Protocols

Routers exchange routes automatically using **routing protocols**, so the network adapts when links change.

## Distance vector

- **RIP** — counts hops; simple, slow to converge, best for small networks.
- **EIGRP** — hybrid, fast, Cisco-era but widely deployed.

Distance-vector routers know "how far" to a destination and periodically share whole tables with neighbours.

## Link state

- **OSPF** — floods link-state information so every router builds the same map of the network and computes the best path.
- **IS-IS** — similar mechanics, common in ISP backbones.

Link-state routers converge faster and handle large topologies better.

## Two worlds

- **Interior Gateway Protocols (IGP)** run inside your autonomous system (OSPF, EIGRP, RIP).
- **Exterior Gateway Protocols (EGP)** connect autonomous systems — the **BGP** that runs the public internet.

> Rule of thumb: OSPF inside the company, BGP at the edges where networks meet.
`,
      },
      {
        slug: 'switching-basics', title: 'Switching Basics', type: 'reading', order: 3,
        content: `
# Switching Basics

Switches forward frames within a network using **MAC address** tables.

## MAC learning

A switch learns that a source MAC address is reachable through the port it arrived on. Later, frames to that destination are only sent out that one port.

## Forwarding decisions

- Destination known → **unicast** out the matching port.
- Destination unknown → **flood** out all ports except the source port (while learning).
- Frames to **broadcast** or multicast → flood.

## Why switches beat hubs

A hub repeats every frame to every port — everyone hears everything. A switch isolates traffic to the correct port, cutting collisions and boosting security.

## VLANs & trunks

**VLANs** split a switch into separate broadcast domains. Frames between switches travel on **trunk** links, tagged with their VLAN. This is how one physical network carries many logical networks.
`,
      },
      {
        slug: 'routing-quiz', title: 'Routing & Switching Quiz', type: 'quiz', order: 4,
        content: `
# Routing & Switching Quiz

Answer all questions. **70% or higher** to pass.

> A switch is a layer-2 device; a router is layer 3.
`,
        quiz: [
          {
            question: 'Which device forwards packets between different networks and works at the Network layer?',
            explanation: 'Routers operate at layer 3 using logical (IP) addresses; switches work at layer 2 with MAC addresses.',
            options: [
              { text: 'Switch', correct: false },
              { text: 'Router', correct: true },
              { text: 'Hub', correct: false },
              { text: 'Repeater', correct: false },
            ],
          },
          {
            question: 'Longest prefix match means a router…',
            explanation: 'A router selects the most specific matching route, i.e. the one with the longest prefix.',
            options: [
              { text: 'Prefer defaults over specifics', correct: false },
              { text: 'Chooses the fastest link only', correct: false },
              { text: 'Picks the most specific matching route', correct: true },
              { text: 'Load-balances every packet', correct: false },
            ],
          },
          {
            question: 'Which routing protocol is used to connect independent networks on the public internet?',
            explanation: 'BGP is the exterior gateway protocol that interconnects internet autonomous systems.',
            options: [
              { text: 'RIP', correct: false },
              { text: 'OSPF', correct: false },
              { text: 'BGP', correct: true },
              { text: 'EIGRP', correct: false },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'dns-dhcp',
    lessons: [
      {
        slug: 'how-dns-works', title: 'How DNS Works', type: 'reading', order: 1,
        content: `
# How DNS Works

The **Domain Name System (DNS)** translates human-friendly names like \`netforge.example\` into IP addresses. It is the phone book of the internet.

## The lookup path

1. Your device asks its configured **resolver**.
2. The resolver may answer from **cache** — if not, it queries from the root.
3. Root servers point to **TLD servers** (e.g. for .com).
4. TLD servers point to the authority **nameserver** for that domain.
5. The authoritative server returns the record, often an **A** (IPv4) or **AAAA** (IPv6) record.

## Record types

| Type | Meaning |
| ---- | ------- |
| A | IPv4 address |
| AAAA | IPv6 address |
| CNAME | Alias to another name |
| MX | Mail server |
| PTR | Reverse: IP → name |
| TXT | Arbitrary text (SPF, verification) |

## Why it feels instant

Answers are **cached** at every step with a **TTL**. When a name changes but a cache is stale, you see old results until the TTL expires — the usual cause of "DNS propagation" delays.

> If a site won\u2019t load but another works, try \`nslookup domain\` then \`ping domain\` to separate DNS failure from connectivity failure.
`,
      },
      {
        slug: 'how-dhcp-works', title: 'How DHCP Works', type: 'reading', order: 2,
        content: `
# How DHCP Works

The **Dynamic Host Configuration Protocol (DHCP)** gives devices an IP address, **subnet mask**, **default gateway**, and DNS settings automatically.

## DORA

DHCP leases flow through four messages:

1. **Discover** — the client broadcasts "is there a DHCP server?"
2. **Offer** — a server offers an address (and options).
3. **Request** — the client answers "yes, I\u2019ll take that one".
4. **Ack** — the server confirms the lease.

## Leases

Addresses are leased for a limited time. Clients renew around half the lease time; if they stop renewing, the address returns to the pool.

## Reserved addresses

Admins can create **reservations** that always assign one client the same IP (matched by **MAC address**). Hosts like printers and routers often use reservations or static config so they never change address.

## Troubleshooting DHCP

- Client stuck at "Identifying…" → check it reaches a server (same broadcast domain or a DHCP relay).
- Wrong gateway/ DNS → check the offered **options**, not just the IP.
- Exhausted pool → watch lease times and usage.

> \`ipconfig /release\` then \`ipconfig /renew\` forces a fresh DORA — the classic DHCP reset.
`,
      },
      {
        slug: 'dns-dhcp-quiz', title: 'DNS & DHCP Quiz', type: 'quiz', order: 3,
        content: `
# DNS & DHCP Quiz

Answer all questions. **70% or higher** to pass.

> Remember DORA: Discover, Offer, Request, Ack.
`,
        quiz: [
          {
            question: 'Which DNS record maps a domain name to an IPv4 address?',
            explanation: 'A records hold IPv4 addresses. AAAA records hold IPv6.',
            options: [
              { text: 'AAAA', correct: false },
              { text: 'MX', correct: false },
              { text: 'A', correct: true },
              { text: 'CNAME', correct: false },
            ],
          },
          {
            question: 'What is the correct order of DHCP messages?',
            explanation: 'Discover, Offer, Request, Ack (DORA) creates the lease.',
            options: [
              { text: 'Request, Offer, Discover, Ack', correct: false },
              { text: 'Discover, Offer, Request, Ack', correct: true },
              { text: 'Offer, Discover, Request, Ack', correct: false },
              { text: 'Discover, Request, Offer, Ack', correct: false },
            ],
          },
          {
            question: 'A device is stuck with no IP address. Which re-request procedure forces a fresh lease?',
            explanation: 'Release then renew drops the old lease and runs DORA again.',
            options: [
              { text: 'ipconfig /flushdns', correct: false },
              { text: 'ipconfig /release && ipconfig /renew', correct: true },
              { text: 'restart the browser', correct: false },
              { text: 'disabling the firewall', correct: false },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'network-devices-wireless',
    lessons: [
      {
        slug: 'network-devices', title: 'Network Devices', type: 'reading', order: 1,
        content: `
# Network Devices

A real network is built from a handful of hardware devices. Knowing what each one does tells you which layer a device "belongs" to.

## Layer by layer

- **Repeater / Hub (layer 1)** — regenerate or duplicate signals. Hubs flood everything and are obsolete except in tiny odd setups.
- **Switch (layer 2)** — forwards frames using **MAC addresses**; the heart of a LAN.
- **Router (layer 3)** — forwards packets between networks using IP addresses.
- **Firewall (layer 3–7)** — filters traffic using rules; guards the boundary of a network.
- **Access point / WAP (layer 2)** — bridges wireless clients onto the wired LAN.
- **Gateway** — a general term for the device that connects your network to another one (usually a router that also does **NAT**).
- **Load balancer** — spreads requests across servers for scale and resilience.
- **IDS / IPS** — watches or stops suspicious activity.

## Where you usually find each

- Home: one box doing router + switch + wireless + firewall + DHCP — that's why it is often called a "home gateway".
- Enterprise: dedicated devices per role, plus power, cabling, and a rack.

> When asked "which device does X?", first decide the layer: signals → 1, frames → 2, packets across networks → 3, filtering → firewall.
`,
      },
      {
        slug: 'wireless-networking', title: 'Wireless Networking', type: 'reading', order: 2,
        content: `
# Wireless Networking

Wireless (Wi-Fi) carries network frames over radio waves instead of cable. The rules are set by the **IEEE 802.11** family.

## Sending and receiving

A client associates with an **access point** (AP) that uses an **SSID** (the network name you see). Authentication and encryption protect the radio link — **WPA2/WPA3** today; avoid legacy WEP.

## The radio problem

Radio is a shared medium: unlike a switch, a Wi-Fi channel is half-duplex (one transmission at a time). **CSMA/CA** helps devices wait for a clear channel before speaking.

## Frequency choices

- **2.4 GHz** — better range/walls, more interference, fewer channels in practice.
- **5 GHz** — faster, less crowded, shorter range.
- **6 GHz (Wi-Fi 6E/7)** — even more spectrum.

## Antennas and signal strength

Signal is measured in dBm (less negative = stronger, e.g. −60 dBm good, −85 dBm poor). Watch for **roaming**: moving between APs can drop sessions if handoff is not handled well.

## Securing Wi-Fi

- Use WPA2/WPA3 with a strong passphrase.
- Change the default admin credentials on the AP.
- Disable WPS or check its policy — it was a common way in.
- Consider a separate **VLAN/guest network** for untrusted devices.

> Home tip: use 5 GHz for moving big files near the AP, 2.4 GHz where the walls win.
`,
      },
      {
        slug: 'devices-quiz', title: 'Network Devices & Wireless Quiz', type: 'quiz', order: 3,
        content: `
# Network Devices & Wireless Quiz

Answer all questions. **70% or higher** to pass.
`,
        quiz: [
          {
            question: 'A wireless client must match which identifier to join the right network?',
            explanation: 'The SSID names the network; clients associate to an access point broadcasting/ advertising that SSID.',
            options: [
              { text: 'MAC address', correct: false },
              { text: 'SSID', correct: true },
              { text: 'IP address', correct: false },
              { text: 'DNS server', correct: false },
            ],
          },
          {
            question: 'Which Wi-Fi security scheme should you avoid because it is easy to crack?',
            explanation: 'WEP is legacy and trivially breakable; use WPA2 or WPA3.',
            options: [
              { text: 'WPA3', correct: false },
              { text: 'WPA2', correct: false },
              { text: 'WEP', correct: true },
              { text: 'Open (no auth)', correct: false },
            ],
          },
          {
            question: 'A device that bridges wireless clients onto the wired LAN is a…',
            explanation: 'An access point connects wireless devices to the wired network at layer 2.',
            options: [
              { text: 'Router', correct: false },
              { text: 'Access point', correct: true },
              { text: 'Load balancer', correct: false },
              { text: 'DNS server', correct: false },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'network-security-basics',
    lessons: [
      {
        slug: 'security-threats', title: 'Security Threats', type: 'reading', order: 1,
        content: `
# Security Threats

Securing a network starts with knowing what it is up against.

## Common threat actors & methods

- **Malware** — viruses, worms, ransomware; delivered by email, drive-by downloads, or unpatched services.
- **Phishing & social engineering** — tricking people into revealing credentials or clicking bad links. The top cause of breaches.
- **DoS / DDoS** — flooding services so legit users can\u2019t get through.
- **Man-in-the-middle (MitM)** — an attacker relaying traffic between two parties, often on rogue Wi-Fi.
- **Credential attacks** — guessing, spraying, and reusing leaked passwords.
- **Zero-day exploits** — attacks on unpatched vulnerabilities.

## Defense mindset

Assume breach readiness: limit what attackers can see, detect unusual activity, and keep backups.

> Rule of thumb: humans are the weakest link — security training matters as much as firewalls.
`,
      },
      {
        slug: 'defense-in-depth', title: 'Defense in Depth', type: 'reading', order: 2,
        content: `
# Defense in Depth

**Defense in depth** means layering controls so a failure at one layer is caught by the next.

## Layers of control

- **Perimeter** — **firewall**, IDS/IPS, border routing.
- **Network segmentation** — **VLANs** and zones limit lateral movement.
- **Access control** — least privilege, **port** hygiene, 802.1X on ports.
- **Endpoint** — patch management, antivirus/EDR, disk encryption.
- **People** — training, strong passphrases, MFA.
- **Data** — encryption at rest and in transit (**HTTPS**, **VPN**).

## Least privilege

Give users and services only the access their job needs. A compromised account with admin rights is how ransomware spreads network-wide.

## Detect and respond

- Central **logging** of authentication and network events.
- Alerts on anomalies: new admin accounts, odd outbound connections.
- **Backups** — offline and tested — because ransomware targets them.

> Good security is boring: patched systems, tight ports, strong auth, tested backups.
`,
      },
      {
        slug: 'cryptography-basics', title: 'Cryptography Basics', type: 'reading', order: 3,
        content: `
# Cryptography Basics

Cryptography keeps data confidential, authentic, and unaltered.

## Symmetric vs asymmetric

- **Symmetric** (AES, ChaCha20) — one shared key; fast; used to encrypt the data stream.
- **Asymmetric** (RSA, ECDSA) — a key pair; private vs public; used to agree keys and sign.

Most traffic uses **hybrid**: asymmetric to safely exchange a symmetric session key, symmetric for the bulk data.

## TLS in practice

When you visit an **HTTPS** site:

1. The server presents a **certificate** signed by a trusted **certificate authority**.
2. The client and server negotiate a session key.
3. All subsequent data is encrypted and integrity-checked.

## Public vs private networks

- **VPNs** encrypt connections across untrusted networks (remote work, site-to-site links).
- **NAT** hides private addresses but does not encrypt anything — it is an addressing technique, not security.
- **Wi-Fi encryption (WPA3)** protects the wireless hop, not the whole path.

> Bottom line: encryption protects data between the two endpoints that hold the keys. What happens at the endpoints is a matter of trust and hygiene.
`,
      },
      {
        slug: 'security-quiz', title: 'Network Security Basics Quiz', type: 'quiz', order: 4,
        content: `
# Network Security Basics Quiz

Answer all questions. **70% or higher** to pass.
`,
        quiz: [
          {
            question: 'Which strategy layers controls so one failure is caught by another?',
            explanation: 'Defense in depth uses multiple independent layers of protection.',
            options: [
              { text: 'Least privilege', correct: false },
              { text: 'Defense in depth', correct: true },
              { text: 'Network Address Translation', correct: false },
              { text: 'A single strong firewall', correct: false },
            ],
          },
          {
            question: 'TLS certificates are typically signed by a…',
            explanation: 'A certificate authority (CA) signs certificates that clients trust.',
            options: [
              { text: 'DHCP server', correct: false },
              { text: 'Certificate authority', correct: true },
              { text: 'Local router', correct: false },
              { text: 'Public DNS resolver', correct: false },
            ],
          },
          {
            question: 'Which technology protects a connection across an untrusted network like the internet?',
            explanation: 'A VPN encrypts the entire tunnel between endpoints.',
            options: [
              { text: 'NAT', correct: false },
              { text: 'VLAN', correct: false },
              { text: 'VPN', correct: true },
              { text: 'DNS caching', correct: false },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'troubleshooting-tools',
    lessons: [
      {
        slug: 'troubleshooting-methodology', title: 'Troubleshooting Methodology', type: 'reading', order: 1,
        content: `
# Troubleshooting Methodology

Good troubleshooting is a repeatable method, not luck.

## The loop

1. **Gather information** — what changed? What exactly fails ("nothing works" tells you nothing).
2. **Identify a hypothesis** — decide the most likely layer or component.
3. **Test** — one change at a time, using measurable tools.
4. **Fix or repeat** — if the test disproves your theory, form a new one.
5. **Verify and document** — confirm the fix, then record what you did.

## Work layer-by-layer

The OSI model is your map. Ask: does this affect everyone on the same switch, or only one device? The answer points at different layers.

## Golden rules

- Change one variable at a time and test after each change.
- Check the physical layer first — cables and power fail far more often than protocols.
- Confirm scope: one device, one segment, or the whole site?
- Keep a log: symptoms, tests, results, fixes.

> The terminal lab later in this course lets you practise this method against scripted faults without touching real gear.
`,
      },
      {
        slug: 'command-line-tools', title: 'Command-Line Tools', type: 'reading', order: 2,
        content: `
# Command-Line Tools

Every admin\u2019s toolkit lives in the terminal. These tools split into two jobs: **reachability** and **addressing**.

## Reachability

- **ping** — sends ICMP echo requests and reports **round-trip time** and loss. Tests basic connectivity (and DNS sometimes, depending how you call it).
- **traceroute** (Windows: \`tracert\`) — shows the **hop-by-hop** path to a destination.
- **telnet host port** — opens a raw connection to test whether a **port** accepts connections.

## Addressing and names

- **ipconfig** — shows this device\u2019s IP, **subnet mask**, **gateway**, and DNS servers. \`/all\` adds MAC and DHCP details.
- **nslookup** — queries **DNS** for records.
- **arp -a** — lists the **MAC address** table learned on the local segment.
- **whois** — ownership details for a domain or address block.
- **netstat** — current sockets, ports, and routing state.
- **route** — views or edits the local routing table.

## The classic checks in order

1. \`ping 127.0.0.1\` — is the stack alive?
2. \`ipconfig\` — do I have an address and mask?
3. \`ping <gateway>\` — can I reach my own network?
4. \`ping <remote IP>\` — is the path up?
5. \`nslookup <domain>\` — does my DNS resolve?
6. \`ping <domain>\` — now check HTTP etc.

> The simulated terminal in the next lesson runs these commands against scripted outputs — practise the order until it is automatic.
`,
      },
      {
        slug: 'simulated-terminal-lab', title: 'Lab: Simulated Troubleshooting Terminal', type: 'lab', order: 3,
        content: `
# Lab: Simulated Troubleshooting Terminal

A fake CLI that produces realistic output — no real network required. Try \`help\`, then run the checks in order (\`ping\`, \`tracert\`, \`ipconfig\`, \`nslookup\`, \`netstat\`, ...). Complete five correct diagnostic commands to finish the lab.

<div data-lab="terminal"></div>
`,
      },
      {
        slug: 'troubleshooting-quiz', title: 'Troubleshooting Tools Quiz', type: 'quiz', order: 4,
        content: `
# Troubleshooting Tools Quiz

Answer all questions. **70% or higher** to pass.
`,
        quiz: [
          {
            question: 'Which command tests whether a specific TCP port accepts connections?',
            explanation: 'A port scan with the OS tool of the day; the classic raw tool is telnet host port.',
            options: [
              { text: 'ping', correct: false },
              { text: 'traceroute', correct: false },
              { text: 'telnet host port', correct: true },
              { text: 'nslookup', correct: false },
            ],
          },
          {
            question: 'To see your subnet mask and default gateway, run…',
            explanation: 'ipconfig (or ip addr on Linux) prints addressing plus mask and gateway.',
            options: [
              { text: 'ping', correct: false },
              { text: 'ipconfig', correct: true },
              { text: 'arp -a', correct: false },
              { text: 'netstat', correct: false },
            ],
          },
          {
            question: '"No route to host" usually points to which layer?',
            explanation: 'Layer 3 — the source cannot find a route to the destination, e.g. bad mask or missing gateway.',
            options: [
              { text: 'Physical (1)', correct: false },
              { text: 'Data Link (2)', correct: false },
              { text: 'Network (3)', correct: true },
              { text: 'Application (7)', correct: false },
            ],
          },
        ],
      },
    ],
  },
];

const badges = [
  { code: 'first_lesson', title: 'First Steps', description: 'Complete your first lesson.', icon: 'footprints' },
  { code: 'module_master', title: 'Module Master', description: 'Complete every lesson in a module.', icon: 'layers' },
  { code: 'course_complete', title: 'NetForge Graduate', description: 'Complete every lesson in the full course.', icon: 'trophy' },
  { code: 'perfect_quiz', title: 'Quiz Ace', description: 'Score 100% on any quiz.', icon: 'zap' },
];

const glossary = [
  { term: 'IP address', definition: 'A logical, unique address (IPv4 or IPv6) that identifies a device on an IP network.', related: ['Subnet mask', 'Default gateway', 'NAT'] },
  { term: 'IPv4', definition: 'The fourth version of IP; 32-bit addresses written as four octets such as 192.168.1.1.', related: ['IP address', 'Subnet mask'] },
  { term: 'Subnet mask', definition: 'A 32-bit value that separates the network portion of an address from the host portion.', related: ['IP address', 'CIDR', 'Subnetting'] },
  { term: 'CIDR', definition: 'Classless Inter-Domain Routing; notation such as /24 that states how many bits form the network portion.', related: ['Subnet mask', 'Subnetting'] },
  { term: 'Default gateway', definition: 'The router a device sends traffic to when the destination is outside its own subnet.', related: ['Router', 'IP address'] },
  { term: 'LAN', definition: 'Local Area Network; a network covering a single building or site.', related: ['WAN', 'Switch'] },
  { term: 'WAN', definition: 'Wide Area Network; interconnects LANs across larger distances, e.g. the internet.', related: ['LAN', 'Router'] },
  { term: 'MAC address', definition: 'The burned-in hardware identifier (layer 2) that switches use to forward frames.', related: ['Switch', 'VLAN'] },
  { term: 'Router', definition: 'A layer-3 device that forwards packets between networks using IP addresses and routing tables.', related: ['Default gateway', 'Routing table'] },
  { term: 'Switch', definition: 'A layer-2 device that forwards frames between ports by learning MAC addresses.', related: ['MAC address', 'VLAN'] },
  { term: 'Firewall', definition: 'A device or service that filters traffic based on rules at layers 3+.', related: ['Defense in depth', 'Port'] },
  { term: 'DNS', definition: 'Domain Name System; translates names like example.com into IP addresses.', related: ['IP address', 'nslookup'] },
  { term: 'DHCP', definition: 'Dynamic Host Configuration Protocol; hands out IP configuration (address, mask, gateway, DNS) on request.', related: ['IP address', 'Default gateway'] },
  { term: 'OSI model', definition: 'A seven-layer reference model for networking (Physical to Application).', related: ['TCP/IP', 'Packet'] },
  { term: 'TCP/IP', definition: 'The protocol suite the internet runs on, organised into four layers.', related: ['OSI model', 'Packet'] },
  { term: 'HTTP', definition: 'HyperText Transfer Protocol; the application-layer protocol of the web, usually carried over TLS as HTTPS.', related: ['TCP/IP', 'Port'] },
  { term: 'HTTPS', definition: 'HTTP over TLS; encrypts and authenticates web traffic.', related: ['HTTP', 'Certificate authority'] },
  { term: 'VPN', definition: 'Virtual Private Network; an encrypted tunnel across an untrusted network.', related: ['Encryption', 'HTTPS'] },
  { term: 'NAT', definition: 'Network Address Translation; rewrites addresses so private ranges can share public ones.', related: ['IP address', 'Default gateway'] },
  { term: 'Packet', definition: 'A unit of data at the Network layer, carrying source/destination IP addressing and a payload.', related: ['TCP/IP', 'Router'] },
  { term: 'Port', definition: 'A 16-bit number that identifies a service or conversation endpoint (e.g. 443 for HTTPS).', related: ['TCP/IP', 'HTTP'] },
  { term: 'SSID', definition: 'Service Set Identifier; the human-visible name of a wireless network.', related: ['Access point', 'WPA2/WPA3'] },
  { term: 'VLAN', definition: 'A virtual LAN; splits a switch into separate broadcast domains using tags.', related: ['Switch', 'Subnet'] },
  { term: 'Subnetting', definition: 'Dividing an address block into smaller subnets to control traffic and organise networks.', related: ['CIDR', 'Subnet mask'] },
  { term: 'Encryption', definition: 'Transforming data so only key holders can read it (confidentiality).', related: ['HTTPS', 'VPN'] },
  { term: 'Round-trip time', definition: 'The time (RTT) for a packet to reach a destination and return; measured by ping.', related: ['Packet', 'Ping'] },
  { term: 'Ping', definition: 'A tool that sends ICMP echo requests to test reachability and measure RTT.', related: ['Round-trip time', 'ICMP'] },
  { term: 'ICMP', definition: 'Internet Control Message Protocol; used by ping and for network error reporting.', related: ['Ping', 'IP address'] },
  { term: 'Access point', definition: 'A device that bridges wireless clients onto a wired LAN.', related: ['SSID', 'Switch'] },
  { term: 'WPA2/WPA3', definition: 'Strong Wi-Fi security standards that encrypt and authenticate the radio link.', related: ['SSID', 'Encryption'] },
  { term: 'Certificate authority', definition: 'A trusted entity that signs TLS certificates.', related: ['HTTPS', 'Encryption'] },
  { term: 'Defense in depth', definition: 'Layering independent controls so one failure is caught by another.', related: ['Firewall', 'VLAN'] },
  { term: 'Routing table', definition: 'A router\u2019s list of known networks and next hops, used for forwarding decisions.', related: ['Router', 'Default gateway'] },
  { term: 'nslookup', definition: 'A command-line tool for querying DNS records.', related: ['DNS'] },
];

function seed(db) {
  const insertModules = db.prepare(
    'INSERT INTO modules (id, slug, title, description, sort_order, is_published) VALUES (?, ?, ?, ?, ?, 1)'
  );
  const insertLesson = db.prepare(
    'INSERT INTO lessons (id, module_id, slug, title, content, lesson_type, sort_order, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
  );
  const insertQuestion = db.prepare(
    'INSERT INTO quiz_questions (id, lesson_id, question_text, explanation, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const insertOption = db.prepare(
    'INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order) VALUES (?, ?, ?, ?)'
  );
  const insertBadge = db.prepare(
    'INSERT INTO badges (id, code, title, description, icon) VALUES (?, ?, ?, ?, ?)'
  );
  const insertGlossary = db.prepare(
    'INSERT INTO glossary_terms (id, term, definition, related_term_ids) VALUES (?, ?, ?, ?)'
  );
  const clear = db.prepare('DELETE FROM lessons'); // cached for callers
  void clear;

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM user_badges').run();
    db.prepare('DELETE FROM quiz_options').run();
    db.prepare('DELETE FROM quiz_questions').run();
    db.prepare('DELETE FROM lesson_progress').run();
    db.prepare('DELETE FROM quiz_attempts').run();
    db.prepare('DELETE FROM notes').run();
    db.prepare('DELETE FROM comments').run();
    db.prepare('DELETE FROM lessons').run();
    db.prepare('DELETE FROM glossary_terms').run();
    db.prepare('DELETE FROM badges').run();
    // Separate delete because it may contain existing FK references (users/modules).
    db.prepare('DELETE FROM modules').run();
    db.prepare('DELETE FROM users').run();
  });
  tx();

  let lessonId = 1;
  let questionId = 1;
  let optionOrder = 1;
  let quizOrder = 1;

  modules.forEach((mod, idx) => {
    const moduleId = idx + 1;
    insertModules.run(moduleId, mods[idx].slug, mods[idx].title, mods[idx].description, idx + 1);

    mod.lessons.forEach((less) => {
      insertLesson.run(lessonId, moduleId, less.slug, less.title, less.content.trim(), less.type, less.order);

      if (less.type === 'quiz' && less.quiz) {
        less.quiz.forEach((q) => {
          insertQuestion.run(questionId, lessonId, q.question, q.explanation, quizOrder);
          q.options.forEach((opt, oi) => {
            insertOption.run(questionId, opt.text, opt.correct ? 1 : 0, oi + 1);
          });
          questionId += 1;
          quizOrder += 1;
        });
      }
      lessonId += 1;
    });
    optionOrder += 100; // irrelevant; sort_order is per-question
  });

  badges.forEach((b, i) => insertBadge.run(i + 1, b.code, b.title, b.description, b.icon));

  glossary.forEach((g, i) => {
    const relatedIds = JSON.stringify(
      (g.related || [])
        .map((name) => glossary.findIndex((x) => x.term === name))
        .filter((idx) => idx !== -1)
        .map((idx) => idx + 1)
    );
    insertGlossary.run(i + 1, g.term, g.definition, relatedIds);
  });

  return {
    modules: modules.length,
    lessons: lessonId - 1,
    questions: questionId - 1,
    badges: badges.length,
    glossary: glossary.length,
  };
}

module.exports = seed;

if (require.main === module) {
  const db = require('./db.js');
  const result = seed(db);
  console.log('Seeded:', result);
}