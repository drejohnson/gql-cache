import gql from "graphql-tag";
import { OneTest } from "./one-test";

export const test: OneTest = {
  name: "with object and null in array",
  query: gql`
    query TestQuery($postIds: [ID!]!) {
      postsByIds(ids: $postIds) {
        id
        __typename
        title
      }
    }
  `,
  variables: { postIds: ["123", "non-existent-id"] },
  response: {
    data: {
      postsByIds: [
        {
          id: "123",
          __typename: "Post",
          title: "My awesome blog post"
        },
        null
      ]
    }
  },
  entities: {
    ROOT_QUERY: {
      'postsByIds({"ids":["123","non-existent-id"]})': ["Post;123", null]
    },
    "Post;123": {
      id: "123",
      __typename: "Post",
      title: "My awesome blog post"
    }
  }
};
