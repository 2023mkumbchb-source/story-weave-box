// Sorting code on line 146
// Assuming sorting is done via an array method like sort()
const sortedBlogs = blogs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));