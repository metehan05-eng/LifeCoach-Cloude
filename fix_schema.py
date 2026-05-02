import re

with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

# Fix generator
content = re.sub(r'generator client {', 'generator client {\n  provider        = "prisma-client-js"\n  previewFeatures = ["multiSchema"]', content)
# Fix datasource
content = re.sub(r'datasource db {', 'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n  schemas  = ["public", "auth"]', content)

# Add @@schema("public") to every model that doesn't have it
def add_schema(match):
    model_body = match.group(2)
    if '@@schema' not in model_body:
        return f'model {match.group(1)} {{\n  @@schema("public")\n{model_body}'
    return match.group(0)

content = re.sub(r'model ([A-Za-z0-9]*) {([\s\S]*?)}', add_schema, content)

with open('prisma/schema.prisma', 'w') as f:
    f.write(content)
