import gql from "graphql-tag";
import { OneTest } from "./one-test";

export const test: OneTest = {
  name: "same entity twice in response but with different fields",
  query: gql`
    query TestQuery {
      posts {
        id
        __typename
        author {
          id
          __typename
          name
        }
        title
        comments {
          id
          __typename
          commenter {
            id
            __typename
            name
            age
          }
        }
      }
    }
  `,
  response: {
    data: {
      posts: [
        {
          id: "123",
          __typename: "Post",
          author: {
            id: "1",
            __typename: "Author",
            name: "Paul"
          },
          title: "My awesome blog post",
          comments: [
            {
              id: "324",
              __typename: "Comment",
              commenter: {
                id: "1",
                __typename: "Author",
                name: "Paul",
                age: 33
              }
            }
          ]
        }
      ]
    }
  },
  entities: {
    ROOT_QUERY: {
      posts: ["Post;123"]
    },
    "Post;123": {
      id: "123",
      __typename: "Post",
      author: "Author;1",
      title: "My awesome blog post",
      comments: ["Comment;324"]
    },
    "Comment;324": {
      id: "324",
      __typename: "Comment",
      commenter: "Author;1"
    },
    "Author;1": { id: "1", __typename: "Author", name: "Paul", age: 33 }
  }
};
