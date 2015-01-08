# Shortbus

Shortbus is a lightweight data processing/ETL module designed to run asynchronous processes in a seemingly synchronous way. The module acts as a mini service bus. The approach helps developers produce more readable data flow code. Code is cleaner, more structured, and provides a means to avoid callback hell.

Syntatically, a Shortbus script is written as a series of event handlers. The script looks a little like an event bus. Functionally, Shortbus queues events
