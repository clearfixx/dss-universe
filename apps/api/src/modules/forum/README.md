# Forum module (Community Hub)

Forum owns the DSS Universe Community Hub. The UI name is `Community Hub`,
the route is `/community` and technical identifiers use `forum`.

CH-0 establishes the structure:

- categories with `PUBLIC`, `MEMBERS` or `RESTRICTED` visibility; restricted
  categories list allowed `role:<name>` and `group:<key>` audience entries;
- forums and one level of subforums inside a category, inheriting its
  visibility;
- category moderator assignments (one moderator may hold several categories);
- supermoderator scope through `forum.moderate.all`;
- structure managers (`forum.structure.manage`) always see every category.

Topics, posts, votes, curators and integrations follow in CH-1…CH-5. See the
[brainstorm](../../../../../docs/development/PHASE_13_COMMUNITY_HUB_BRAINSTORM.md)
and [CH-0 package](../../../../../docs/development/PHASE_13_CH0_FORUM_STRUCTURE.md).

🏛️ Every good forum starts with knowing which door leads where — and who holds the keys.
