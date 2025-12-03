from abc import ABCMeta


class ManagedService(metaclass=ABCMeta):
    """
    All services that are available for injection should subclass this.
    """

    def shutdown(self) -> None:
        """
        If a service needs to shut down cleanly, it should
        override this method and implement the shutdown process here.
        """
        pass
